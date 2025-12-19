import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

const { width } = Dimensions.get('window');

export type ActivityType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface ActivityConfirmationModalProps {
  visible: boolean;
  type: ActivityType;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const getIconConfig = (type: ActivityType) => {
  switch (type) {
    case 'success':
      return { name: 'checkmark-circle', color: '#10B981', bgColor: '#ECFDF5' };
    case 'error':
      return { name: 'close-circle', color: '#EF4444', bgColor: '#FEF2F2' };
    case 'warning':
      return { name: 'warning', color: '#F59E0B', bgColor: '#FFFBEB' };
    case 'info':
      return { name: 'information-circle', color: '#3B82F6', bgColor: '#EFF6FF' };
    case 'confirm':
      return { name: 'help-circle', color: '#6366F1', bgColor: '#EEF2FF' };
    default:
      return { name: 'information-circle', color: '#3B82F6', bgColor: '#EFF6FF' };
  }
};

export default function ActivityConfirmationModal({
  visible,
  type,
  title,
  message,
  onClose,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  autoClose = false,
  autoCloseDelay = 2000,
}: ActivityConfirmationModalProps) {
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const iconConfig = getIconConfig(type);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto close for success/info types
      if (autoClose && (type === 'success' || type === 'info')) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);
        return () => clearTimeout(timer);
      }
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    handleClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    handleClose();
  };

  const isConfirmType = type === 'confirm' || type === 'warning';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: iconConfig.bgColor }]}>
            <Ionicons
              name={iconConfig.name as any}
              size={48}
              color={iconConfig.color}
            />
          </View>

          {/* Content */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {isConfirmType ? (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelButtonText}>{cancelText}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.confirmButton,
                    type === 'warning' && styles.warningButton,
                  ]}
                  onPress={handleConfirm}
                >
                  <Text style={styles.confirmButtonText}>{confirmText}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.singleButton, { backgroundColor: iconConfig.color }]}
                onPress={handleClose}
              >
                <Text style={styles.confirmButtonText}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Simplified hook for using the modal
export const useActivityModal = () => {
  const [modalState, setModalState] = React.useState({
    visible: false,
    type: 'info' as ActivityType,
    title: '',
    message: '',
    onConfirm: undefined as (() => void) | undefined,
    onCancel: undefined as (() => void) | undefined,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    autoClose: false,
  });

  const showSuccess = (title: string, message: string, autoClose = true) => {
    setModalState({
      visible: true,
      type: 'success',
      title,
      message,
      onConfirm: undefined,
      onCancel: undefined,
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      autoClose,
    });
  };

  const showError = (title: string, message: string) => {
    setModalState({
      visible: true,
      type: 'error',
      title,
      message,
      onConfirm: undefined,
      onCancel: undefined,
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      autoClose: false,
    });
  };

  const showWarning = (title: string, message: string, onConfirm?: () => void) => {
    setModalState({
      visible: true,
      type: 'warning',
      title,
      message,
      onConfirm,
      onCancel: undefined,
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      autoClose: false,
    });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
  ) => {
    setModalState({
      visible: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
      onCancel: undefined,
      confirmText,
      cancelText,
      autoClose: false,
    });
  };

  const showInfo = (title: string, message: string, autoClose = true) => {
    setModalState({
      visible: true,
      type: 'info',
      title,
      message,
      onConfirm: undefined,
      onCancel: undefined,
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      autoClose,
    });
  };

  const hideModal = () => {
    setModalState(prev => ({ ...prev, visible: false }));
  };

  return {
    modalState,
    showSuccess,
    showError,
    showWarning,
    showConfirm,
    showInfo,
    hideModal,
    ActivityModal: () => (
      <ActivityConfirmationModal
        visible={modalState.visible}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onClose={hideModal}
        onConfirm={modalState.onConfirm}
        onCancel={modalState.onCancel}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        autoClose={modalState.autoClose}
      />
    ),
  };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: Math.min(width - 40, 340),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleButton: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  warningButton: {
    backgroundColor: '#EF4444',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
