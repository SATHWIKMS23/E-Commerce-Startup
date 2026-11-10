# AtlasBasket Customer Mobile App

A cross-platform React Native & Expo mobile application for **AtlasBasket** — designed to be an exact mobile counterpart of the `customer-app` web platform with 1:1 parity in UI, dark monochrome glass styling, colors, features, and real-time backend synchronization.

Compatible with both **iOS** and **Android**.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Expo CLI (`npm install -g expo-cli` or via `npx expo`)
- Expo Go app on your physical iOS/Android device, or an iOS Simulator / Android Emulator.

### Installation & Run

1. Navigate to the `customer-mobile-app` directory:
   ```bash
   cd customer-mobile-app
   ```

2. Start the development server:
   ```bash
   npx expo start
   ```

3. Launch on target device:
   - **Android**: Press `a` or run `npm run android`
   - **iOS**: Press `i` or run `npm run ios`
   - **Physical Device**: Scan the QR code displayed in the terminal with the **Expo Go** camera (iOS) or within the Expo Go app (Android).

---

## 📱 Features & Screen Parity

The mobile app reproduces every single feature and screen from `customer-app`:

- **Dynamic Public Branding**: Fetches live marketplace name, tagline, hero headings, buttons, and logos from `/api/branding/public` or `/api/branding` with offline fallback.
- **Top Header Bar**:
  - Live brand logo & typography
  - Location chip (`📍 Mysuru, Karnataka ▼`) with address selector and operational coverage check
  - Instant Search popup modal
  - Notification icon with unread badge count
  - Shopping Cart icon with live item badge
  - User avatar / Sign In shortcut
- **Shop Names Marquee**: Horizontal auto-scrolling ticker of featured local creator shops.
- **Home Screen**:
  - Hero Section: Eyebrow badge, bold 3-line headline ("Buy Anything. From Anyone. Near You."), subheading, and action CTAs ("Explore Shops", "Browse Products").
  - Categories Section: Allowed categories grid with high-resolution iconography.
  - Featured Creators: Cards with banner, avatar bridge, location badge, title, description, and "Browse shop" link.
  - Custom Prints Callout: Bespoke order commission CTA.
  - Value Props: 4 core value proposition cards.
- **Explore Products Screen**:
  - Mode filter tabs: "Browse All", "Recommended", "Recently Viewed".
  - Keyword search input & category filter pills.
  - Product cards: Thumbnail, Shop badge, Star rating, formatted INR price (`₹XX.XX`), stock status.
  - Pagination controls.
- **Product Details Screen**:
  - Full image view, Shop navigation link, title, live price calculation based on selected variant, stock quantity indicator.
  - Variant selector options.
  - Detailed product description.
  - Customer reviews breakdown & comments.
  - Sticky bottom actions: Wishlist toggle, "Add to Cart", and "Buy Now".
- **Shops & Shop Details**:
  - Browse local maker shops with banner, logo, and pickup location badge.
  - Shop Details with owner contact chips (email, phone, address) and shop product catalog.
- **Cart & Slide-Over Drawer**:
  - Cart item list with thumbnail, product & variant title, unit price, quantity increment/decrement controls, item deletion, and "Move to Wishlist".
  - Subtotal calculation in INR.
- **Checkout Screen**:
  - Saved shipping address selector.
  - Delivery method selection: Platform Delivery vs Seller / Self Pickup.
  - Coupon code validation & discount application.
  - Payment method selection: Cash on Delivery (COD) or Online / Razorpay.
  - Itemized total summary and order placement.
- **Order History & Details**:
  - Comprehensive order list with order number, status badge (Pending, Processing, Shipped, Delivered, Cancelled), payment type, date, total items, and grand total.
  - Detailed breakdown of order items per seller, shipping address, and support link.
- **Custom Orders & 3D Prints**:
  - Request bespoke 3D prints or craft orders (Title, specs, material, quantity, files).
  - Review quotes submitted by makers (turnaround time, price, notes) with Accept & Reject actions.
- **Wishlist**: Saved favorite items with 1-tap "Move to Cart".
- **Notifications**: System and order notifications with unread dot indicators and "Mark All Read".
- **Support Chat**: Direct customer service messaging desk with ticket categorization and message threads.
- **Profile & Account Management**:
  - Edit personal details (name, phone).
  - Saved delivery address book: create address, set default, remove.
  - Sign in, Sign up, Forgot password recovery, and Sign out.

---

## 🎨 Theme & Colors

Direct 1:1 mapping of `globals.css` monochrome luxury tokens:
- **Background**: `#0a0a0a` / `#080808`
- **Cards & Popovers**: `#121212` with subtle borders (`rgba(255, 255, 255, 0.08)`)
- **Primary**: `#ffffff` (text: `#000000`)
- **Text**: Foreground `#fafafa`, muted `#8c8c8c`, dim `rgba(255, 255, 255, 0.35)`
- **Accents**: Destructive `#ef4444`, Success `#10b981`, Warning `#f59e0b`, Support Indigo `#4f46e5`

---

## 🔒 Security & Scope Compliance

All work is strictly isolated within the `customer-mobile-app` directory. No existing web or backend directories were altered.
