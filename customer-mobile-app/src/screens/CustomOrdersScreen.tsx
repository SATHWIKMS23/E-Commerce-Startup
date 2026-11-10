import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Plus,
  Box,
  Calendar,
  Clock,
  Check,
  X,
  FileText,
  ArrowLeft,
} from 'lucide-react-native';
import { customOrderService, CustomOrder } from '../services/customOrder.service';
import { productService } from '../services/product.service';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

export const CustomOrdersScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // New order form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [material, setMaterial] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCustomOrders = async () => {
    setIsLoading(true);
    try {
      const res = await customOrderService.getCustomOrders();
      setOrders(res);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomOrders();
  }, []);

  const handleCreateOrder = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Required Fields', 'Please provide a title and detailed description for your order.');
      return;
    }

    setIsSubmitting(true);
    try {
      await customOrderService.createCustomOrder({
        title: title.trim(),
        description: description.trim(),
        material: material.trim() || undefined,
        quantity: parseInt(quantity, 10) || 1,
      });
      setModalVisible(false);
      setTitle('');
      setDescription('');
      setMaterial('');
      setQuantity('1');
      loadCustomOrders();
      Alert.alert('Success', 'Your custom request has been posted to verified creators!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptQuote = async (orderId: string, quoteId: string) => {
    try {
      await customOrderService.acceptQuote(orderId, quoteId);
      Alert.alert('Quote Accepted', 'The creator has been notified to begin production.');
      loadCustomOrders();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not accept quote');
    }
  };

  const handleRejectQuote = async (orderId: string, quoteId: string) => {
    try {
      await customOrderService.rejectQuote(orderId, quoteId);
      Alert.alert('Quote Rejected', 'The quote has been declined.');
      loadCustomOrders();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not reject quote');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.topNavTitle}>Custom Orders & Prints</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
          <Plus size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Bespoke Requests</Text>
          <Text style={styles.subtitle}>
            Order custom 3D prints, tailored clothing, craft designs, and view quotes from makers.
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : orders.length > 0 ? (
          orders.map((item) => (
            <View key={item.id} style={styles.orderCard}>
              <View style={styles.cardTop}>
                <Text style={styles.orderTitle}>{item.title}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{item.status}</Text>
                </View>
              </View>

              <Text style={styles.orderDesc}>{item.description}</Text>

              <View style={styles.metaRow}>
                {item.material && (
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipText}>Material: {item.material}</Text>
                  </View>
                )}
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>Qty: {item.quantity}</Text>
                </View>
              </View>

              {/* Quotes */}
              {item.quotes && item.quotes.length > 0 && (
                <View style={styles.quotesSection}>
                  <Text style={styles.quotesHeader}>Maker Quotes ({item.quotes.length})</Text>
                  {item.quotes.map((q) => (
                    <View key={q.id} style={styles.quoteCard}>
                      <View style={styles.quoteHeader}>
                        <Text style={styles.quoteShop}>{q.sellerShopName || 'Maker'}</Text>
                        <Text style={styles.quotePrice}>
                          {productService.formatPrice(q.price)}
                        </Text>
                      </View>
                      <View style={styles.quoteDetails}>
                        <Clock size={12} color={colors.foregroundMuted} />
                        <Text style={styles.quoteLeadTime}>
                          {q.leadTimeDays} days turnaround
                        </Text>
                      </View>
                      {q.notes ? <Text style={styles.quoteNotes}>{q.notes}</Text> : null}

                      {q.status === 'PENDING' && (
                        <View style={styles.quoteActions}>
                          <TouchableOpacity
                            onPress={() => handleAcceptQuote(item.id, q.id)}
                            style={styles.acceptBtn}
                          >
                            <Check size={14} color={colors.primaryForeground} />
                            <Text style={styles.acceptBtnText}>Accept Quote</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleRejectQuote(item.id, q.id)}
                            style={styles.rejectBtn}
                          >
                            <Text style={styles.rejectBtnText}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Box size={48} color={colors.foregroundDim} />
            <Text style={styles.emptyTitle}>No custom orders</Text>
            <Text style={styles.emptySub}>
              Have an idea for a custom product or 3D print? Tap + above to get started.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* New Custom Order Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Custom Order</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 6 }}>
                <X size={20} color={colors.foregroundMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Custom 3D Printed Bracket"
                placeholderTextColor={colors.foregroundDim}
                style={styles.input}
              />

              <Text style={styles.inputLabel}>Specifications & Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Dimensions, color, requirements, finishing details..."
                placeholderTextColor={colors.foregroundDim}
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                multiline
              />

              <Text style={styles.inputLabel}>Material (Optional)</Text>
              <TextInput
                value={material}
                onChangeText={setMaterial}
                placeholder="e.g. PLA, PETG, Resin, Wood, Cotton"
                placeholderTextColor={colors.foregroundDim}
                style={styles.input}
              />

              <Text style={styles.inputLabel}>Quantity</Text>
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                placeholder="1"
                placeholderTextColor={colors.foregroundDim}
                keyboardType="numeric"
                style={styles.input}
              />

              <TouchableOpacity
                onPress={handleCreateOrder}
                disabled={isSubmitting}
                style={styles.submitBtn}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={styles.submitBtnText}>Post Request to Makers</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
  },
  backBtn: {
    padding: 6,
  },
  topNavTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '800',
  },
  addBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.foregroundMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    marginBottom: 14,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTitle: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusBadgeText: {
    color: colors.foreground,
    fontSize: 10,
    fontWeight: '800',
  },
  orderDesc: {
    color: colors.foregroundMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  metaChipText: {
    color: colors.foregroundDim,
    fontSize: 10,
  },
  quotesSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
    gap: 8,
  },
  quotesHeader: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  quoteCard: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quoteShop: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
  },
  quotePrice: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '900',
  },
  quoteDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  quoteLeadTime: {
    color: colors.foregroundMuted,
    fontSize: 11,
  },
  quoteNotes: {
    color: colors.foregroundDim,
    fontSize: 11,
    marginTop: 4,
  },
  quoteActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  acceptBtnText: {
    color: colors.primaryForeground,
    fontSize: 11,
    fontWeight: '800',
  },
  rejectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  rejectBtnText: {
    color: colors.foregroundMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    gap: 10,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    color: colors.foregroundMuted,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 260,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '800',
  },
  inputLabel: {
    color: colors.foregroundMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderRadius: 12,
    backgroundColor: colors.glassInputBg,
    borderWidth: 1,
    borderColor: colors.glassInputBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.foreground,
    fontSize: 13,
  },
  submitBtn: {
    marginTop: 20,
    marginBottom: 30,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: colors.primaryForeground,
    fontSize: 13,
    fontWeight: '800',
  },
});
