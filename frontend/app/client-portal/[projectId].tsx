import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import Colors from '../../constants/Colors';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://site-ops-hub.preview.emergentagent.com';

export default function ClientPortalScreen() {
  const { projectId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [hasChat, setHasChat] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline');
  
  // Chat states
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [clientName, setClientName] = useState('Client');
  const [refreshing, setRefreshing] = useState(false);
  
  const scrollViewRef = useRef(null);
  const messagesScrollRef = useRef(null);

  useEffect(() => {
    loadPortalData();
  }, []);

  const loadPortalData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/client-portal/${projectId}`);
      const data = response.data;
      
      setProject(data.project);
      setMilestones(data.milestones || []);
      setConversationId(data.conversation_id);
      setHasChat(data.has_chat);
      
      if (data.has_chat && data.conversation_id) {
        await loadMessages(data.conversation_id);
      }
    } catch (err) {
      console.error('Error loading portal data:', err);
      setError(err.response?.data?.detail || 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/client-portal/conversation/${convId}/messages?limit=50`
      );
      setMessages(response.data || []);
      
      // Scroll to bottom after loading messages
      setTimeout(() => {
        messagesScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || sendingMessage) return;

    try {
      setSendingMessage(true);
      const response = await axios.post(
        `${API_URL}/api/client-portal/conversation/${conversationId}/messages`,
        {
          content: newMessage.trim(),
          attachments: []
        },
        {
          params: {
            client_name: clientName,
            client_id: 'client_user'
          }
        }
      );

      // Add the new message to the list
      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
      
      // Scroll to bottom
      setTimeout(() => {
        messagesScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Error sending message:', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPortalData();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMessageTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return '#10B981';
      case 'in_progress':
        return '#F59E0B';
      case 'pending':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="Colors.primary" />
          <Text style={styles.loadingText}>Loading Project Portal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Access Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPortalData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="business-outline" size={24} color="Colors.primary" />
          <Text style={styles.headerTitle}>{project?.name || 'Project Portal'}</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'timeline' && styles.activeTab]}
          onPress={() => setActiveTab('timeline')}
        >
          <Ionicons 
            name="calendar-outline" 
            size={20} 
            color={activeTab === 'timeline' ? Colors.primary : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'timeline' && styles.activeTabText]}>
            Timeline
          </Text>
        </TouchableOpacity>
        
        {hasChat && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
            onPress={() => setActiveTab('chat')}
          >
            <Ionicons 
              name="chatbubble-outline" 
              size={20} 
              color={activeTab === 'chat' ? Colors.primary : '#6B7280'} 
            />
            <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>
              Chat
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {activeTab === 'timeline' ? (
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Project Info */}
          <View style={styles.projectCard}>
            <Text style={styles.projectName}>{project?.name || 'Project'}</Text>
            {project?.description && (
              <Text style={styles.projectDescription}>{project.description}</Text>
            )}
            <View style={styles.projectDates}>
              <View style={styles.dateItem}>
                <Ionicons name="play-circle-outline" size={16} color="#10B981" />
                <Text style={styles.dateText}>Start: {formatDate(project?.start_date || '')}</Text>
              </View>
              <View style={styles.dateItem}>
                <Ionicons name="flag-outline" size={16} color="#EF4444" />
                <Text style={styles.dateText}>End: {formatDate(project?.end_date || '')}</Text>
              </View>
            </View>
            {project?.status && (
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(project.status)}20` }]}>
                <Text style={[styles.statusText, { color: getStatusColor(project.status) }]}>
                  {project.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Milestones */}
          {milestones.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="flag" size={18} color="#F59E0B" /> Project Milestones
              </Text>
              {milestones.map((milestone, index) => (
                <View key={milestone.id || index} style={styles.milestoneCard}>
                  <View style={styles.milestoneHeader}>
                    <Text style={styles.milestoneName}>{milestone.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(milestone.status || '')}20` }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(milestone.status || '') }]}>
                        {milestone.status?.replace('_', ' ') || 'Pending'}
                      </Text>
                    </View>
                  </View>
                  {milestone.description && (
                    <Text style={styles.description}>{milestone.description}</Text>
                  )}
                  <View style={styles.milestoneFooter}>
                    <Text style={styles.dueDate}>Due: {formatDate(milestone.due_date || '')}</Text>
                    {milestone.progress !== undefined && (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View
                            style={[styles.progressFill, { width: `${milestone.progress}%` }]}
                          />
                        </View>
                        <Text style={styles.progressText}>{milestone.progress}%</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {milestones.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#CBD5E0" />
              <Text style={styles.emptyText}>No milestones available yet</Text>
              <Text style={styles.emptySubtext}>Check back later for project updates</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        // Chat Tab
        <KeyboardAvoidingView 
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Messages */}
          <ScrollView 
            ref={messagesScrollRef}
            style={styles.messagesContainer}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={() => conversationId && loadMessages(conversationId)} 
              />
            }
          >
            {messages.map((message, index) => (
              <View 
                key={message.id || index} 
                style={[
                  styles.messageCard,
                  message.sender_role === 'client' ? styles.clientMessage : styles.teamMessage
                ]}
              >
                <View style={styles.messageHeader}>
                  <Text style={styles.senderName}>
                    {message.sender_name} 
                    <Text style={styles.senderRole}>
                      {message.sender_role === 'client' ? ' (You)' : ` (${message.sender_role})`}
                    </Text>
                  </Text>
                  <Text style={styles.messageTime}>
                    {formatMessageTime(message.created_at)}
                  </Text>
                </View>
                <Text style={styles.messageContent}>{message.content}</Text>
              </View>
            ))}
            
            {messages.length === 0 && (
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubble-outline" size={48} color="#CBD5E0" />
                <Text style={styles.emptyChatText}>No messages yet</Text>
                <Text style={styles.emptyChatSubtext}>Start a conversation with your project team</Text>
              </View>
            )}
          </ScrollView>

          {/* Message Input */}
          <View style={styles.messageInputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type your message..."
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sendingMessage}
            >
              {sendingMessage ? (
                <ActivityIndicator size="small" color="Colors.surface" />
              ) : (
                <Ionicons name="send" size={20} color="Colors.surface" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: 'Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: 'Colors.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#4A5568',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'Colors.textPrimary,
  },
  errorText: {
    fontSize: 14,
    color: 'Colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: 'Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: 'Colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  projectCard: {
    backgroundColor: 'Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  projectName: {
    fontSize: 20,
    fontWeight: '700',
    color: 'Colors.textPrimary,
    marginBottom: 8,
  },
  projectDescription: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 12,
    lineHeight: 20,
  },
  projectDates: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#4A5568',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'Colors.textPrimary,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  milestoneCard: {
    backgroundColor: '#FFF7ED',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'Colors.textPrimary,
    flex: 1,
  },
  milestoneFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dueDate: {
    fontSize: 12,
    color: 'Colors.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    width: 60,
    height: 6,
    backgroundColor: 'Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  description: {
    fontSize: 13,
    color: '#4A5568',
    marginTop: 4,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
  },
  // Chat styles
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageCard: {
    backgroundColor: 'Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  clientMessage: {
    backgroundColor: '#EBF8FF',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  teamMessage: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'Colors.textPrimary,
  },
  senderRole: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  messageContent: {
    fontSize: 14,
    color: 'Colors.surface,
    lineHeight: 20,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyChatText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'Colors.textSecondary,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: 'Colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'Colors.border,
    gap: 12,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    maxHeight: 100,
    backgroundColor: '#F9FAFB',
  },
  sendButton: {
    backgroundColor: 'Colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
});