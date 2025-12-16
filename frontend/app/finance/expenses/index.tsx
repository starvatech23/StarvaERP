import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import Colors from '../../../constants/Colors';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { expensesAPI, projectsAPI } from '../../../services/api';
import ModalSelector from '../../../components/ModalSelector';

export default function ExpensesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadProjects();
      loadExpenses();
    }, [selectedProject, selectedCategory])
  );

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadExpenses = async () => {
    try {
      const response = await expensesAPI.getAll(
        selectedProject || undefined,
        selectedCategory || undefined,
        undefined,
        undefined
      );
      setExpenses(response.data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (expenseId: string) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await expensesAPI.delete(expenseId);
              loadExpenses();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: any = {
      labor: Colors.primary,
      materials: '#10B981',
      equipment: '#F59E0B',
      subcontractors: '#8B5CF6',
      permits: '#EF4444',
      overhead: '#6B7280',
      contingency: '#EC4899',
      other: '#14B8A6',
    };
    return colors[category] || '#6B7280';
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expenses</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/finance/expenses/add' as any)}
        >
          <Ionicons name="add" size={24} color={Colors.surface} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Project:</Text>
          <View style={{ flex: 1 }}>
            <ModalSelector
              options={[
                { label: 'All Projects', value: '' },
                ...projects.map((p) => ({ label: p.name, value: p.id })),
              ]}
              selectedValue={selectedProject}
              onValueChange={setSelectedProject}
              placeholder="All Projects"
            />
          </View>
        </View>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Category:</Text>
          <View style={{ flex: 1 }}>
            <ModalSelector
              options={[
                { label: 'All Categories', value: '' },
                { label: 'Labor', value: 'labor' },
                { label: 'Materials', value: 'materials' },
                { label: 'Equipment', value: 'equipment' },
                { label: 'Other', value: 'other' },
              ]}
              selectedValue={selectedCategory}
              onValueChange={setSelectedCategory}
              placeholder="All Categories"
            />
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#CBD5E0" />
            <Text style={styles.emptyText}>No expenses yet</Text>
            <Text style={styles.emptySubtext}>Add expenses to track spending</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/finance/expenses/add' as any)}
            >
              <Text style={styles.emptyButtonText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        ) : (
          expenses.map((expense) => (
            <View key={expense.id} style={styles.expenseCard}>
              <View style={styles.expenseHeader}>
                <View style={styles.expenseLeft}>
                  <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(expense.category) }]} />
                  <View>
                    <Text style={styles.expenseDescription}>{expense.description}</Text>
                    <Text style={styles.expenseCategory}>{expense.category}</Text>
                  </View>
                </View>
                <View style={styles.expenseActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => router.push(`/finance/expenses/edit/${expense.id}` as any)}
                  >
                    <Ionicons name="pencil" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleDelete(expense.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.expenseDetails}>
                <View style={styles.expenseRow}>
                  <Text style={styles.expenseLabel}>Amount:</Text>
                  <Text style={styles.expenseAmount}>{formatCurrency(expense.amount)}</Text>
                </View>
                {expense.vendor_name && (
                  <View style={styles.expenseRow}>
                    <Text style={styles.expenseLabel}>Vendor:</Text>
                    <Text style={styles.expenseValue}>{expense.vendor_name}</Text>
                  </View>
                )}
                <View style={styles.expenseRow}>
                  <Text style={styles.expenseLabel}>Date:</Text>
                  <Text style={styles.expenseValue}>
                    {new Date(expense.expense_date).toLocaleDateString()}
                  </Text>
                </View>
                {expense.created_by_name && (
                  <View style={styles.expenseRow}>
                    <Text style={styles.expenseLabel}>Recorded by:</Text>
                    <Text style={styles.expenseValue}>{expense.created_by_name}</Text>
                  </View>
                )}
              </View>

              {expense.receipt_image && (
                <Image
                  source={{ uri: expense.receipt_image }}
                  style={styles.receiptImage}
                  resizeMode="cover"
                />
              )}
            </View>
          ))
        )}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    width: 80,
  },
  content: {
    flex: 1,
    padding: 16,
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
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  expenseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  expenseDescription: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  expenseCategory: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  expenseDetails: {
    gap: 6,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expenseLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  expenseValue: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
  receiptImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 12,
  },
});