import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useProducts } from '../hooks/useProducts';
import { productService } from '../services/productService';
import { productApi, Product } from '../api/productApi';
import { useFileUpload } from '@/features/storage/hooks/useFileUpload';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { useUIStore } from '@/lib/store/uiStore';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { Dialog } from '@/shared/components/Dialog';
import { Skeleton } from '@/shared/components/Skeleton';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Package,
  Upload,
  Image as ImageIcon,
} from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface ProductListPageProps {
  navigation: any;
}

export function ProductListPage({ navigation }: ProductListPageProps) {
  const { products, isLoading, refetch, createProduct, updateProduct, deleteProduct } = useProducts();
  const showConfirm = useConfirmStore((s) => s.showConfirm);
  const showToast = useUIStore((s) => s.showToast);

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('0');
  const [imageUrl, setImageUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { pickAndUpload, isUploading } = useFileUpload({ folder: 'products' });

  useEffect(() => {
    productApi.getAllowedCategories()
      .then(setCategories)
      .catch((e) => console.log('Error loading categories:', e));
  }, []);

  const handleUpload = async () => {
    const res = await pickAndUpload();
    if (res?.url) {
      setImageUrl(res.url);
      showToast('Product photo uploaded successfully', 'success');
    }
  };

  const openCreateDialog = () => {
    setName('');
    setQuantity('1');
    setPrice('0');
    setImageUrl('');
    setCategoryId(categories[0]?.id || '');
    setIsCreateOpen(true);
  };

  const openEditDialog = (prod: Product) => {
    setSelectedProduct(prod);
    setQuantity(prod.stockQuantity.toString());
    setPrice(prod.price.toString());
    setImageUrl(prod.imageUrl);
    setCategoryId(prod.categoryId || '');
    setIsEditOpen(true);
  };

  const handleCreateSubmit = async () => {
    const pQuantity = parseInt(quantity, 10);
    const pPrice = parseFloat(price);

    const validation = productService.validateCreate({
      productname: name,
      productquantity: pQuantity,
      productprice: pPrice,
      imageKey: imageUrl,
      categoryId,
    });

    if (!validation.valid) {
      showToast(validation.error || 'Please fill in product details', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await createProduct({
        productname: name.trim(),
        productquantity: pQuantity,
        productprice: pPrice,
        imageUrl,
        categoryId: categoryId || undefined,
      });
      showToast('Product created successfully', 'success');
      setIsCreateOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to create product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedProduct) return;
    const pQuantity = parseInt(quantity, 10);
    const pPrice = parseFloat(price);

    const validation = productService.validateEdit({
      productquantity: pQuantity,
      productprice: pPrice,
      imageKey: imageUrl,
      categoryId,
    });

    if (!validation.valid) {
      showToast(validation.error || 'Please fill in product details', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await updateProduct({
        id: selectedProduct.id,
        payload: {
          productquantity: pQuantity,
          productprice: pPrice,
          imageUrl,
          categoryId: categoryId || undefined,
        },
      });
      showToast('Product updated successfully', 'success');
      setIsEditOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to update product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (prod: Product) => {
    showConfirm({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${prod.name}"? It will no longer be visible to buyers.`,
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await deleteProduct(prod.id);
          showToast('Product deleted', 'success');
        } catch (err: any) {
          showToast(err.message || 'Failed to delete product', 'error');
        }
      },
    });
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesStock = true;
    if (stockFilter === 'LOW') matchesStock = p.stockQuantity > 0 && p.stockQuantity <= 10;
    if (stockFilter === 'OUT') matchesStock = p.stockQuantity === 0;
    return matchesSearch && matchesStock;
  });

  return (
    <DashboardLayout title="Products" navigation={navigation} currentRoute="/products">
      <View style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Input
            placeholder="Search catalog items…"
            value={searchQuery}
            onChangeText={setSearchQuery}
            containerStyle={{ flex: 1, marginBottom: 0 }}
            icon={<Search size={16} color={Colors.textMuted} />}
          />
          <Button
            variant="default"
            size="sm"
            onPress={openCreateDialog}
            style={{ marginLeft: 8 }}
            icon={<Plus size={16} color="#000000" />}
          >
            Add
          </Button>
        </View>

        {/* Stock Filter Tabs */}
        <View style={styles.filterTabs}>
          {(['ALL', 'LOW', 'OUT'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setStockFilter(tab)}
              style={[styles.filterTab, stockFilter === tab && styles.filterTabActive]}
            >
              <Text style={[styles.filterTabText, stockFilter === tab && styles.filterTabTextActive]}>
                {tab === 'ALL' ? 'All Stock' : tab === 'LOW' ? 'Low Stock' : 'Out of Stock'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Products List */}
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {
                refetch();
              }}
              tintColor={Colors.purpleLight}
            />
          }
        >
          {isLoading ? (
            <View style={{ gap: 10 }}>
              <Skeleton height={80} borderRadius={14} />
              <Skeleton height={80} borderRadius={14} />
              <Skeleton height={80} borderRadius={14} />
            </View>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((prod) => (
              <Card key={prod.id} style={styles.productCard}>
                <View style={styles.productRow}>
                  <View style={styles.productImgBox}>
                    {prod.imageUrl ? (
                      <Image source={{ uri: prod.imageUrl }} style={styles.productImg} />
                    ) : (
                      <Package size={22} color="rgba(255, 255, 255, 0.3)" />
                    )}
                  </View>

                  <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {prod.name}
                    </Text>
                    <Text style={styles.productPrice}>
                      {productService.formatPrice(prod.price)}
                    </Text>
                    <View style={styles.stockRow}>
                      <Badge
                        variant={
                          prod.stockQuantity === 0
                            ? 'destructive'
                            : prod.stockQuantity <= 10
                            ? 'warning'
                            : 'secondary'
                        }
                        style={{ paddingVertical: 1 }}
                      >
                        {prod.stockQuantity === 0
                          ? 'Out of Stock'
                          : `${prod.stockQuantity} in stock`}
                      </Badge>
                    </View>
                  </View>

                  <View style={styles.actionColumn}>
                    <TouchableOpacity
                      onPress={() => openEditDialog(prod)}
                      style={styles.iconBtn}
                    >
                      <Edit2 size={16} color="rgba(255, 255, 255, 0.8)" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(prod)}
                      style={[styles.iconBtn, { marginTop: 6 }]}
                    >
                      <Trash2 size={16} color={Colors.rose} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Package size={40} color="rgba(255, 255, 255, 0.2)" />
              <Text style={styles.emptyText}>No catalog items found.</Text>
            </View>
          )}
        </ScrollView>

        {/* Create Product Dialog */}
        <Dialog
          open={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Add New Catalog Item"
          description="List a new physical item on your marketplace shop"
        >
          <View style={{ gap: 10 }}>
            <Input
              label="Product Name"
              placeholder="Handmade Ceramic Vase"
              value={name}
              onChangeText={setName}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Stock Units"
                  placeholder="10"
                  keyboardType="number-pad"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Price (₹)"
                  placeholder="499.00"
                  keyboardType="decimal-pad"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>
            </View>

            {/* Image Preview & Upload */}
            <Text style={styles.label}>Product Image</Text>
            <View style={styles.uploadBox}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.previewImg} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <ImageIcon size={28} color="rgba(255, 255, 255, 0.3)" />
                  <Text style={styles.uploadText}>No image selected</Text>
                </View>
              )}
              <Button
                variant="outline"
                size="sm"
                onPress={handleUpload}
                loading={isUploading}
                icon={<Upload size={14} color="#ffffff" />}
                style={{ marginTop: 10 }}
              >
                Choose Photo
              </Button>
            </View>

            <Button
              variant="default"
              loading={submitting}
              onPress={handleCreateSubmit}
              style={{ marginTop: 14 }}
            >
              Publish Item
            </Button>
          </View>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Edit Catalog Item"
          description={`Update price and stock for "${selectedProduct?.name}"`}
        >
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Stock Units"
                  placeholder="10"
                  keyboardType="number-pad"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Price (₹)"
                  placeholder="499.00"
                  keyboardType="decimal-pad"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>
            </View>

            <Text style={styles.label}>Product Image</Text>
            <View style={styles.uploadBox}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.previewImg} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <ImageIcon size={28} color="rgba(255, 255, 255, 0.3)" />
                </View>
              )}
              <Button
                variant="outline"
                size="sm"
                onPress={handleUpload}
                loading={isUploading}
                icon={<Upload size={14} color="#ffffff" />}
                style={{ marginTop: 10 }}
              >
                Change Photo
              </Button>
            </View>

            <Button
              variant="default"
              loading={submitting}
              onPress={handleEditSubmit}
              style={{ marginTop: 14 }}
            >
              Save Changes
            </Button>
          </View>
        </Dialog>
      </View>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  filterTabActive: {
    backgroundColor: Colors.purpleBg,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
  },
  filterTabText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
  },
  filterTabTextActive: {
    color: Colors.purpleLight,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  productCard: {
    padding: 12,
    marginBottom: 10,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImgBox: {
    height: 60,
    width: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImg: {
    height: '100%',
    width: '100%',
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.purpleLight,
    marginBottom: 4,
  },
  stockRow: {
    flexDirection: 'row',
  },
  actionColumn: {
    alignItems: 'center',
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  uploadBox: {
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  uploadText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  previewImg: {
    height: 100,
    width: 100,
    borderRadius: 12,
  },
});
