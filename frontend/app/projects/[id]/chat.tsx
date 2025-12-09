import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
  Share,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { chatAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

export default function ProjectChatScreen() {
  const router = useRouter();
  const { id: projectId } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  
  const flatListRef = useRef<FlatList>(null);
  const pollingInterval = useRef<any>(null);

  useEffect(() => {
    loadConversation();
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [projectId]);

  const loadConversation = async () => {
    try {
      const convRes = await chatAPI.getOrCreateConversation(String(projectId));
      setConversation(convRes.data);
      await loadMessages(convRes.data.id);
      
      // Start polling for new messages
      startPolling(convRes.data.id);
    } catch (error: any) {
      console.error('Error loading conversation:', error);
      Alert.alert('Error', 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const res = await chatAPI.getMessages(conversationId);
      setMessages(res.data);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const startPolling = (conversationId: string) => {
    // Poll every 3 seconds for new messages
    pollingInterval.current = setInterval(async () => {
      try {
        const res = await chatAPI.getMessages(conversationId, 0, 50);
        const newMsgs = res.data || [];
        
        // Only update if we have different message count or new message IDs
        if (newMsgs.length !== messages.length) {
          setMessages(newMsgs);
          setTimeout(() => scrollToBottom(), 100);
        } else if (newMsgs.length > 0 && messages.length > 0) {
          // Check if last message is different
          const lastNewMsg = newMsgs[newMsgs.length - 1];
          const lastCurrentMsg = messages[messages.length - 1];
          if (lastNewMsg?.id !== lastCurrentMsg?.id) {
            setMessages(newMsgs);
            setTimeout(() => scrollToBottom(), 100);
          }
        }
      } catch (error: any) {
        // Silently fail on polling errors to avoid spamming console
        // Only log if it's not a network issue
        if (error?.response?.status !== 401 && error?.response?.status !== 403) {
          console.log('Polling update skipped');
        }
      }
    }, 3000);
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    
    try {
      setSending(true);
      
      await chatAPI.sendMessage(conversation.id, {
        content: newMessage.trim() || '📎 Attachment',
        attachments: attachments
      });
      
      setNewMessage('');
      setAttachments([]);
      
      // Reload messages after sending
      await loadMessages(conversation.id);
      
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || error?.message || 'Failed to send message';
      Alert.alert('Error', errorMsg);
      console.error('Send error:', error?.response?.data || error);
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAttachment(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAttachment(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadAttachment = async (file: any) => {
    try {
      Alert.alert('Uploading', 'Please wait...');
      
      const formData: any = {
        uri: file.uri,
        type: file.mimeType || file.type || 'application/octet-stream',
        name: file.name || file.fileName || 'file',
      };

      const response = await chatAPI.uploadAttachment(formData);
      setAttachments([...attachments, response.data]);
      Alert.alert('Success', 'File uploaded successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to upload file');
      console.error('Upload error:', error);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      const chatText = messages.map((msg: any) => 
        `[${new Date(msg.created_at).toLocaleString()}] ${msg.sender_name}: ${msg.content}`
      ).join('\n\n');
      
      const url = `whatsapp://send?text=${encodeURIComponent('Project Chat:\n\n' + chatText)}`;
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'WhatsApp is not installed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share via WhatsApp');
    }
  };

  const handleShareEmail = async () => {
    try {
      const chatText = messages.map((msg: any) => 
        `[${new Date(msg.created_at).toLocaleString()}] ${msg.sender_name}: ${msg.content}`
      ).join('\n\n');
      
      const subject = `Project Chat - ${conversation?.project_name}`;
      const body = `Project Chat History:\n\n${chatText}`;
      
      await Linking.openURL(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to share via email');
    }
  };

  const handleShare = () => {
    Alert.alert(
      'Share Chat',
      'How would you like to share this conversation?',
      [
        { text: 'WhatsApp', onPress: handleShareWhatsApp },
        { text: 'Email', onPress: handleShareEmail },
        {
          text: 'Other',
          onPress: async () => {
            const chatText = messages.map((msg: any) => 
              `[${new Date(msg.created_at).toLocaleString()}] ${msg.sender_name}: ${msg.content}`
            ).join('\n\n');
            
            await Share.share({
              message: `Project Chat:\n\n${chatText}`,
              title: conversation?.project_name
            });
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderMessage = ({ item }: any) => {
    const isMe = item.sender_id === user?._id;
    
    return (
      <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.theirMessage]}>
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
          {!isMe && (
            <Text style={styles.senderName}>{item.sender_name}</Text>
          )}
          <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
            {item.content}
          </Text>
          
          {item.attachments && item.attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {item.attachments.map((att: any, idx: number) => (
                <View key={idx} style={styles.attachmentBadge}>
                  <Ionicons 
                    name={att.file_type === 'image' ? 'image' : 'document'} 
                    size={16} 
                    color={isMe ? Colors.surface : Colors.secondary} 
                  />
                  <Text style={[styles.attachmentText, isMe && styles.myMessageText]}>
                    {att.file_name}
                  </Text>
                </View>
              ))}
            </View>
          )}
          
          <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.theirTimestamp]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color=Colors.secondary />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color=Colors.textPrimary />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{conversation?.project_name}</Text>
            <Text style={styles.headerSubtitle}>
              {conversation?.participant_names?.join(', ') || 'Loading...'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <Ionicons name="share-outline" size={24} color=Colors.secondary />
          </TouchableOpacity>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToBottom}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#CBD5E0" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
          }
        />

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <View style={styles.attachmentsPreview}>
            {attachments.map((att, idx) => (
              <View key={idx} style={styles.attachmentPreviewItem}>
                <Ionicons name="document" size={16} color=Colors.secondary />
                <Text style={styles.attachmentPreviewText} numberOfLines={1}>
                  {att.file_name}
                </Text>
                <TouchableOpacity onPress={() => {
                  const newAtts = attachments.filter((_, i) => i !== idx);
                  setAttachments(newAtts);
                }}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.attachButton}
            onPress={() => {
              Alert.alert(
                'Add Attachment',
                'Choose attachment type',
                [
                  { text: 'Photo/Video', onPress: handlePickImage },
                  { text: 'Document', onPress: handlePickDocument },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            }}
          >
            <Ionicons name="attach" size={24} color=Colors.textSecondary />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#CBD5E0"
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity 
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending || (!newMessage.trim() && attachments.length === 0)}
          >
            {sending ? (
              <ActivityIndicator size="small" color=Colors.surface />
            ) : (
              <Ionicons name="send" size={20} color=Colors.surface />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: 'Colors.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: { marginRight: 12 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: 'Colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  shareButton: { marginLeft: 12 },
  messagesList: { padding: 16, flexGrow: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  messageContainer: { marginBottom: 12 },
  myMessage: { alignItems: 'flex-end' },
  theirMessage: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  myBubble: { backgroundColor: Colors.secondary, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'Colors.border },
  senderName: { fontSize: 12, fontWeight: '600', color: Colors.secondary, marginBottom: 4 },
  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: 'Colors.surface },
  theirMessageText: { color: 'Colors.textPrimary },
  attachmentsContainer: { marginTop: 8, gap: 4 },
  attachmentBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  attachmentText: { fontSize: 13, color: 'Colors.secondary },
  timestamp: { fontSize: 10, marginTop: 4 },
  myTimestamp: { color: Colors.surface, opacity: 0.8, textAlign: 'right' },
  theirTimestamp: { color: 'Colors.textSecondary },
  attachmentsPreview: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 12,
    gap: 8,
  },
  attachmentPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 8,
    borderRadius: 8,
    gap: 8,
  },
  attachmentPreviewText: { flex: 1, fontSize: 14, color: 'Colors.textPrimary },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: Colors.textPrimary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#CBD5E0' },
});
