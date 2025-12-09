import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import Colors from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import {
  projectsAPI,
  tasksAPI,
  budgetsAPI,
  invoicesAPI,
  expensesAPI,
} from '../../services/api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationItem {
  id: string;
  type: 'budget' | 'payment' | 'task' | 'project' | 'expense';
  title: string;
  message: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
  read: boolean;
  data?: any;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please enable notifications to receive alerts');
    }
  };

  const loadNotifications = async () => {
    try {
      // Generate notifications based on system data
      const generatedNotifications: NotificationItem[] = [];

      // Load data in parallel
      const [projectsRes, tasksRes, budgetsRes, invoicesRes, expensesRes] = await Promise.all([
        projectsAPI.getAll(),
        tasksAPI.getAll(),
        budgetsAPI.getAll(),
        invoicesAPI.getAll(),
        expensesAPI.getAll(),
      ]);

      const projects = projectsRes.data || [];
      const tasks = tasksRes.data || [];
      const budgets = budgetsRes.data || [];
      const invoices = invoicesRes.data || [];
      const expenses = expensesRes.data || [];

      // Budget overrun alerts
      budgets.forEach((budget: any) => {
        if (budget.spent_amount && budget.allocated_amount) {
          const utilizationPercent = (budget.spent_amount / budget.allocated_amount) * 100;
          if (utilizationPercent >= 90) {
            generatedNotifications.push({
              id: `budget-${budget.id}`,
              type: 'budget',
              title: '⚠️ Budget Alert',
              message: `${budget.category.replace('_', ' ')} budget is ${utilizationPercent.toFixed(0)}% utilized`,
              time: new Date().toISOString(),
              priority: utilizationPercent >= 100 ? 'high' : 'medium',
              read: false,
              data: budget,
            });
          }
        }
      });

      // Overdue invoices
      invoices.forEach((invoice: any) => {
        if (invoice.status === 'overdue' || 
            (invoice.status !== 'paid' && new Date(invoice.due_date) < new Date())) {
          generatedNotifications.push({
            id: `invoice-${invoice.id}`,
            type: 'payment',
            title: '💰 Payment Overdue',
            message: `Invoice ${invoice.invoice_number} is overdue - ₹${invoice.balance_due?.toFixed(0) || invoice.total_amount?.toFixed(0)}`,
            time: invoice.due_date,
            priority: 'high',
            read: false,
            data: invoice,
          });
        }
      });

      // Due soon invoices (within 3 days)
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      invoices.forEach((invoice: any) => {
        if (invoice.status !== 'paid' && 
            new Date(invoice.due_date) <= threeDaysFromNow &&
            new Date(invoice.due_date) >= new Date()) {
          generatedNotifications.push({
            id: `invoice-due-${invoice.id}`,
            type: 'payment',
            title: '📅 Payment Due Soon',
            message: `Invoice ${invoice.invoice_number} due on ${new Date(invoice.due_date).toLocaleDateString()}`,
            time: invoice.due_date,
            priority: 'medium',
            read: false,
            data: invoice,
          });
        }
      });

      // Overdue tasks
      tasks.forEach((task: any) => {
        if (task.status !== 'completed' && 
            task.due_date &&
            new Date(task.due_date) < new Date()) {
          generatedNotifications.push({
            id: `task-${task.id}`,
            type: 'task',
            title: '📋 Task Overdue',
            message: `"${task.title}" was due on ${new Date(task.due_date).toLocaleDateString()}`,
            time: task.due_date,
            priority: 'high',
            read: false,
            data: task,
          });
        }
      });

      // Due soon tasks (within 2 days)
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
      tasks.forEach((task: any) => {
        if (task.status !== 'completed' &&
            task.due_date &&
            new Date(task.due_date) <= twoDaysFromNow &&
            new Date(task.due_date) >= new Date()) {
          generatedNotifications.push({
            id: `task-due-${task.id}`,
            type: 'task',
            title: '⏰ Task Due Soon',
            message: `"${task.title}" due on ${new Date(task.due_date).toLocaleDateString()}`,
            time: task.due_date,
            priority: 'medium',
            read: false,
            data: task,
          });
        }
      });

      // Delayed projects
      projects.forEach((project: any) => {
        if (project.status === 'in_progress' &&
            project.expected_completion_date &&
            new Date(project.expected_completion_date) < new Date()) {
          generatedNotifications.push({
            id: `project-${project.id}`,
            type: 'project',
            title: '🏗️ Project Delayed',
            message: `"${project.name}" is behind schedule`,
            time: project.expected_completion_date,
            priority: 'high',
            read: false,
            data: project,
          });
        }
      });

      // Large expenses (over 50k)
      expenses.forEach((expense: any) => {
        if (expense.amount >= 50000 && isRecent(expense.expense_date, 3)) {
          generatedNotifications.push({
            id: `expense-${expense.id}`,
            type: 'expense',
            title: '💸 Large Expense',
            message: `₹${expense.amount.toLocaleString()} spent on ${expense.category.replace('_', ' ')}`,
            time: expense.expense_date,
            priority: 'medium',
            read: false,
            data: expense,
          });
        }
      });

      // Sort by priority and time
      generatedNotifications.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(b.time).getTime() - new Date(a.time).getTime();
      });

      setNotifications(generatedNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const isRecent = (dateString: string, days: number) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= days;
  };

  const handleNotificationPress = (notification: NotificationItem) => {
    // Mark as read
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );

    // Navigate based on type
    switch (notification.type) {
      case 'budget':
        router.push('/finance/budgets' as any);
        break;
      case 'payment':
        router.push('/finance/invoices' as any);
        break;
      case 'task':
        router.push('/(tabs)/tasks' as any);
        break;
      case 'project':
        router.push('/(tabs)/projects' as any);
        break;
      case 'expense':
        router.push('/finance/expenses' as any);
        break;
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'budget':
        return 'wallet';
      case 'payment':
        return 'cash';
      case 'task':
        return 'checkbox';
      case 'project':
        return 'briefcase';
      case 'expense':
        return 'receipt';
      default:
        return 'notifications';
    }
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color=Colors.primary />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color=Colors.textPrimary />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
          <Ionicons name="checkmark-done" size={24} color=Colors.primary />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
            Unread ({notifications.filter(n => !n.read).length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadNotifications();
          }} />
        }
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>You're all caught up!</Text>
          </View>
        ) : (
          filteredNotifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[styles.notificationCard, !notification.read && styles.unreadCard]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={styles.notificationIcon}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: `${getPriorityColor(notification.priority)}20` },
                  ]}
                >
                  <Ionicons
                    name={getTypeIcon(notification.type) as any}
                    size={20}
                    color={getPriorityColor(notification.priority)}
                  />
                </View>
              </View>

              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  {!notification.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                <Text style={styles.notificationTime}>{formatTime(notification.time)}</Text>
              </View>

              <View style={styles.priorityIndicator}>
                <View
                  style={[
                    styles.priorityDot,
                    { backgroundColor: getPriorityColor(notification.priority) },
                  ]}
                />
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  filterTextActive: {
    color: Colors.surface,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unreadCard: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  notificationIcon: {
    marginRight: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  priorityIndicator: {
    justifyContent: 'center',
    marginLeft: 8,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A5568',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
});
