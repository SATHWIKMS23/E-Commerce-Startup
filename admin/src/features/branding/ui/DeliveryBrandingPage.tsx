"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deliveryApi } from "@/features/delivery/api/deliveryApi";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useUIStore } from "@/lib/store/uiStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/Card";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { Skeleton } from "@/shared/components/Skeleton";
import { Badge } from "@/shared/components/Badge";
import { ImageUploadField } from "@/shared/components/ImageUploadField";
import {
  Truck,
  Sparkles,
  Palette,
  Save,
  RotateCcw,
  Eye,
  ShieldAlert,
  Lock,
  MapPin,
  CheckCircle2,
  Sliders,
  DollarSign,
  Bike,
  ExternalLink,
  Layers,
  ArrowRight,
} from "lucide-react";

interface DeliveryBrandingFormState {
  // Brand Identity (Synced with Navbar & Header)
  brandName: string;
  brandTagline: string;
  brandLogoUrl: string;
  activeCity: string;
  activeCitiesStr: string;

  // Hero Section
  heroBadgeText: string;
  heroHeadingLine1: string;
  heroHeadingLine2: string;
  heroDescription: string;

  // Stat Card 1: Rider Payout
  showCardPayout: boolean;
  cardPayoutValue: string;
  cardPayoutLabel: string;
  cardPayoutDesc: string;

  // Stat Card 2: Active City
  showCardCity: boolean;
  cardCityValue: string;
  cardCityLabel: string;
  cardCityDesc: string;

  // Stat Card 3: Registration Fee
  showCardFee: boolean;
  cardFeeValue: string;
  cardFeeLabel: string;
  cardFeeDesc: string;

  // Stat Card 4: Vehicles
  showCardVehicles: boolean;
  cardVehiclesValue: string;
  cardVehiclesLabel: string;
  cardVehiclesDesc: string;
}

const DEFAULT_FORM: DeliveryBrandingFormState = {
  brandName: "AtlasBasket Delivery",
  brandTagline: "Local Delivery Fleet",
  brandLogoUrl: "",
  activeCity: "Mysuru",
  activeCitiesStr: "Mysuru",
  heroBadgeText: "Now Launching Across Mysuru City",
  heroHeadingLine1: "Deliver locally.",
  heroHeadingLine2: "Earn directly with every trip.",
  heroDescription:
    "Join AtlasBasket Delivery. Deliver orders from top local shops and marketplace sellers in Mysuru. Enjoy flexible hours, transparent distance pricing, and fast weekly payouts.",
  showCardPayout: true,
  cardPayoutValue: "~90%",
  cardPayoutLabel: "Rider Payout",
  cardPayoutDesc: "Direct earnings share",
  showCardCity: true,
  cardCityValue: "Mysuru",
  cardCityLabel: "Active City",
  cardCityDesc: "Local delivery zones",
  showCardFee: true,
  cardFeeValue: "₹0 Free",
  cardFeeLabel: "Registration Fee",
  cardFeeDesc: "No upfront fees",
  showCardVehicles: true,
  cardVehiclesValue: "Bikes & EVs",
  cardVehiclesLabel: "Vehicles Welcome",
  cardVehiclesDesc: "Bicycles welcome",
};

export function DeliveryBrandingPage() {
  const { can } = usePermissions();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();

  const canView = can("branding.view") || can("delivery.view");
  const canManage = can("branding.manage") || can("delivery.manage") || can("settings.manage");

  const [form, setForm] = useState<DeliveryBrandingFormState>(DEFAULT_FORM);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["delivery-settings"],
    queryFn: deliveryApi.getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => deliveryApi.updateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-branding", "delivery"] });
      showToast("Delivery branding and landing cards updated successfully.", "success");
      setHasChanges(false);
    },
    onError: (err: any) => {
      showToast(err?.message || "Failed to save delivery branding", "error");
    },
  });

  useEffect(() => {
    if (!settingsData?.settings) return;
    const s = settingsData.settings;
    const citiesList: string[] = Array.isArray(s.activeCities) && s.activeCities.length > 0
      ? s.activeCities
      : [s.activeCity || "Mysuru"];

    setForm({
      brandName: s.brandName || "AtlasBasket Delivery",
      brandTagline: s.brandTagline || "Local Delivery Fleet",
      brandLogoUrl: s.brandLogoUrl || "",
      activeCity: s.activeCity || "Mysuru",
      activeCitiesStr: citiesList.join(", "),
      heroBadgeText: s.heroBadgeText || "Now Launching Across Mysuru City",
      heroHeadingLine1: s.heroHeadingLine1 || "Deliver locally.",
      heroHeadingLine2: s.heroHeadingLine2 || "Earn directly with every trip.",
      heroDescription:
        s.heroDescription ||
        "Join AtlasBasket Delivery. Deliver orders from top local shops and marketplace sellers in Mysuru. Enjoy flexible hours, transparent distance pricing, and fast weekly payouts.",
      showCardPayout: s.showCardPayout ?? true,
      cardPayoutValue: s.cardPayoutValue || `~${Number(s.riderPayoutPercentage || 90)}%`,
      cardPayoutLabel: s.cardPayoutLabel || "Rider Payout",
      cardPayoutDesc: s.cardPayoutDesc || "Direct earnings share",
      showCardCity: s.showCardCity ?? true,
      cardCityValue: s.cardCityValue || s.activeCity || "Mysuru",
      cardCityLabel: s.cardCityLabel || "Active City",
      cardCityDesc: s.cardCityDesc || "Local delivery zones",
      showCardFee: s.showCardFee ?? true,
      cardFeeValue: s.cardFeeValue || "₹0 Free",
      cardFeeLabel: s.cardFeeLabel || "Registration Fee",
      cardFeeDesc: s.cardFeeDesc || "No upfront fees",
      showCardVehicles: s.showCardVehicles ?? true,
      cardVehiclesValue: s.cardVehiclesValue || "Bikes & EVs",
      cardVehiclesLabel: s.cardVehiclesLabel || "Vehicles Welcome",
      cardVehiclesDesc: s.cardVehiclesDesc || "Bicycles welcome",
    });
    setHasChanges(false);
  }, [settingsData]);

  const update = (key: keyof DeliveryBrandingFormState) => (value: any) => {
    setForm((current) => ({ ...current, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!canManage) return;

    const parsedCities = form.activeCitiesStr
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const payload = {
      brandName: form.brandName.trim(),
      brandTagline: form.brandTagline.trim(),
      brandLogoUrl: form.brandLogoUrl.trim() || null,
      activeCity: form.activeCity.trim() || "Mysuru",
      activeCities: parsedCities.length > 0 ? parsedCities : [form.activeCity.trim() || "Mysuru"],
      heroBadgeText: form.heroBadgeText.trim(),
      heroHeadingLine1: form.heroHeadingLine1.trim(),
      heroHeadingLine2: form.heroHeadingLine2.trim(),
      heroDescription: form.heroDescription.trim(),
      showCardPayout: form.showCardPayout,
      cardPayoutValue: form.cardPayoutValue.trim(),
      cardPayoutLabel: form.cardPayoutLabel.trim(),
      cardPayoutDesc: form.cardPayoutDesc.trim(),
      showCardCity: form.showCardCity,
      cardCityValue: form.cardCityValue.trim(),
      cardCityLabel: form.cardCityLabel.trim(),
      cardCityDesc: form.cardCityDesc.trim(),
      showCardFee: form.showCardFee,
      cardFeeValue: form.cardFeeValue.trim(),
      cardFeeLabel: form.cardFeeLabel.trim(),
      cardFeeDesc: form.cardFeeDesc.trim(),
      showCardVehicles: form.showCardVehicles,
      cardVehiclesValue: form.cardVehiclesValue.trim(),
      cardVehiclesLabel: form.cardVehiclesLabel.trim(),
      cardVehiclesDesc: form.cardVehiclesDesc.trim(),
      reason: "Delivery branding & stat cards updated from Admin Panel",
    };

    updateMutation.mutate(payload);
  };

  const handleReset = () => {
    if (settingsData?.settings) {
      const s = settingsData.settings;
      const citiesList: string[] = Array.isArray(s.activeCities) && s.activeCities.length > 0
        ? s.activeCities
        : [s.activeCity || "Mysuru"];

      setForm({
        brandName: s.brandName || "AtlasBasket Delivery",
        brandTagline: s.brandTagline || "Local Delivery Fleet",
        brandLogoUrl: s.brandLogoUrl || "",
        activeCity: s.activeCity || "Mysuru",
        activeCitiesStr: citiesList.join(", "),
        heroBadgeText: s.heroBadgeText || "Now Launching Across Mysuru City",
        heroHeadingLine1: s.heroHeadingLine1 || "Deliver locally.",
        heroHeadingLine2: s.heroHeadingLine2 || "Earn directly with every trip.",
        heroDescription:
          s.heroDescription ||
          "Join AtlasBasket Delivery. Deliver orders from top local shops and marketplace sellers in Mysuru. Enjoy flexible hours, transparent distance pricing, and fast weekly payouts.",
        showCardPayout: s.showCardPayout ?? true,
        cardPayoutValue: s.cardPayoutValue || `~${Number(s.riderPayoutPercentage || 90)}%`,
        cardPayoutLabel: s.cardPayoutLabel || "Rider Payout",
        cardPayoutDesc: s.cardPayoutDesc || "Direct earnings share",
        showCardCity: s.showCardCity ?? true,
        cardCityValue: s.cardCityValue || s.activeCity || "Mysuru",
        cardCityLabel: s.cardCityLabel || "Active City",
        cardCityDesc: s.cardCityDesc || "Local delivery zones",
        showCardFee: s.showCardFee ?? true,
        cardFeeValue: s.cardFeeValue || "₹0 Free",
        cardFeeLabel: s.cardFeeLabel || "Registration Fee",
        cardFeeDesc: s.cardFeeDesc || "No upfront fees",
        showCardVehicles: s.showCardVehicles ?? true,
        cardVehiclesValue: s.cardVehiclesValue || "Bikes & EVs",
        cardVehiclesLabel: s.cardVehiclesLabel || "Vehicles Welcome",
        cardVehiclesDesc: s.cardVehiclesDesc || "Bicycles welcome",
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setHasChanges(false);
  };

  if (!canView) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardContent className="pt-6 flex items-center gap-4 text-rose-400">
            <ShieldAlert className="h-8 w-8 flex-shrink-0" />
            <div>
              <p className="font-semibold">Access Restricted</p>
              <p className="text-sm text-rose-300/80">
                You do not have permission to view or manage delivery platform branding.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Truck className="h-6 w-6 text-zinc-300" />
              Delivery Branding & UI Management
            </h1>
            <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-300 text-xs">
              Delivery Scope
            </Badge>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Manage rider-facing navbar title, logo, landing hero copy, active cities, and stat cards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={updateMutation.isPending}
              className="border-white/10 text-zinc-300 hover:bg-white/5"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Reset
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!canManage || !hasChanges || updateMutation.isPending}
            className="bg-white text-zinc-950 hover:bg-zinc-200 font-semibold shadow-sm"
          >
            {updateMutation.isPending ? (
              <>
                <span className="h-4 w-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin mr-1.5" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {!canManage && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <Lock className="h-4 w-4 flex-shrink-0" />
          <span>You have read-only access. Saving changes requires the <code>branding.manage</code> or <code>delivery.manage</code> permission.</span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full bg-white/[0.03]" />
          <Skeleton className="h-64 w-full bg-white/[0.03]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Controls Form */}
          <div className="lg:col-span-7 space-y-6">
            {/* Section 1: Navbar & Core Identity */}
            <Card className="bg-[#0b0b0e] border-white/[0.08]">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                  <Palette className="h-4 w-4 text-zinc-400" />
                  Navbar & Core Identity
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Controls the top navbar title, logo, and active dispatch city shown in the delivery app.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                    Brand Name / Navbar Title
                  </label>
                  <Input
                    value={form.brandName}
                    onChange={(e) => update("brandName")(e.target.value)}
                    placeholder="AtlasBasket Delivery"
                    disabled={!canManage}
                    className="bg-white/[0.03] border-white/10 text-white"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Rendered prominently in the top navbar next to the logo.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                      Brand Tagline / Fleet Label
                    </label>
                    <Input
                      value={form.brandTagline}
                      onChange={(e) => update("brandTagline")(e.target.value)}
                      placeholder="Local Delivery Fleet"
                      disabled={!canManage}
                      className="bg-white/[0.03] border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                      Primary Active City
                    </label>
                    <Input
                      value={form.activeCity}
                      onChange={(e) => update("activeCity")(e.target.value)}
                      placeholder="Mysuru"
                      disabled={!canManage}
                      className="bg-white/[0.03] border-white/10 text-white"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Displayed below the title as &quot;{form.activeCity} Fleet&quot;.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                    Active Delivery Cities (Comma-separated)
                  </label>
                  <Input
                    value={form.activeCitiesStr}
                    onChange={(e) => update("activeCitiesStr")(e.target.value)}
                    placeholder="Mysuru, Bengaluru"
                    disabled={!canManage}
                    className="bg-white/[0.03] border-white/10 text-white"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Cities where the local delivery network is operational.
                  </p>
                </div>

                {/* Logo Upload & URL */}
                <div className="pt-2 border-t border-white/[0.06] space-y-3">
                  <label className="text-xs font-medium text-zinc-300 block">
                    Navbar Logo
                  </label>
                  <ImageUploadField
                    value={form.brandLogoUrl}
                    folder="delivery_branding"
                    label="Upload Delivery Brand Logo"
                    hint="Recommended: Square or horizontal PNG/WEBP with transparent background"
                    onChange={(res) => update("brandLogoUrl")(res.url)}
                    onRemove={() => update("brandLogoUrl")("")}
                    disabled={!canManage}
                  />
                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">
                      Or paste an absolute image URL:
                    </span>
                    <Input
                      value={form.brandLogoUrl}
                      onChange={(e) => update("brandLogoUrl")(e.target.value)}
                      placeholder="https://..."
                      disabled={!canManage}
                      className="bg-white/[0.03] border-white/10 text-white text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Landing Page Hero Section */}
            <Card className="bg-[#0b0b0e] border-white/[0.08]">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-zinc-400" />
                  Hero Section Copy
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Headline, badge, and value proposition on the delivery homepage.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                    Hero Badge Text
                  </label>
                  <Input
                    value={form.heroBadgeText}
                    onChange={(e) => update("heroBadgeText")(e.target.value)}
                    placeholder="Now Launching Across Mysuru City"
                    disabled={!canManage}
                    className="bg-white/[0.03] border-white/10 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                      Heading Line 1
                    </label>
                    <Input
                      value={form.heroHeadingLine1}
                      onChange={(e) => update("heroHeadingLine1")(e.target.value)}
                      placeholder="Deliver locally."
                      disabled={!canManage}
                      className="bg-white/[0.03] border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                      Heading Line 2
                    </label>
                    <Input
                      value={form.heroHeadingLine2}
                      onChange={(e) => update("heroHeadingLine2")(e.target.value)}
                      placeholder="Earn directly with every trip."
                      disabled={!canManage}
                      className="bg-white/[0.03] border-white/10 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                    Hero Description
                  </label>
                  <textarea
                    rows={3}
                    value={form.heroDescription}
                    onChange={(e) => update("heroDescription")(e.target.value)}
                    placeholder="Join AtlasBasket Delivery. Deliver orders from top local shops..."
                    disabled={!canManage}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/20"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Landing Stat Cards (Controlled by Admin with Toggle On/Off & Configurable Values) */}
            <Card className="bg-[#0b0b0e] border-white/[0.08]">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-zinc-400" />
                  Landing Stat Cards (Admin Controlled)
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Toggle each card On/Off, configure the display number/value, and set custom labels.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Card 1: Rider Payout */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-zinc-400" />
                      Card 1: Rider Payout
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-300">
                      <span>{form.showCardPayout ? "Enabled (Visible)" : "Disabled (Hidden)"}</span>
                      <input
                        type="checkbox"
                        checked={form.showCardPayout}
                        onChange={(e) => update("showCardPayout")(e.target.checked)}
                        disabled={!canManage}
                        className="h-4 w-4 rounded border-white/20 bg-white/10 text-white focus:ring-0 cursor-pointer"
                      />
                    </label>
                  </div>
                  {form.showCardPayout && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Display Value</label>
                        <Input
                          value={form.cardPayoutValue}
                          onChange={(e) => update("cardPayoutValue")(e.target.value)}
                          placeholder="~90%"
                          disabled={!canManage}
                          className="bg-white/[0.03] border-white/10 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Card Label</label>
                        <Input
                          value={form.cardPayoutLabel}
                          onChange={(e) => update("cardPayoutLabel")(e.target.value)}
                          placeholder="Rider Payout"
                          disabled={!canManage}
                          className="bg-white/[0.03] border-white/10 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Subtitle / Note</label>
                        <Input
                          value={form.cardPayoutDesc}
                          onChange={(e) => update("cardPayoutDesc")(e.target.value)}
                          placeholder="Direct earnings share"
                          disabled={!canManage}
                          className="bg-white/[0.03] border-white/10 text-white text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 2: Active City */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                      Card 2: Active City
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-300">
                      <span>{form.showCardCity ? "Enabled (Visible)" : "Disabled (Hidden)"}</span>
                      <input
                        type="checkbox"
                        checked={form.showCardCity}
                        onChange={(e) => update("showCardCity")(e.target.checked)}
                        disabled={!canManage}
                        className="h-4 w-4 rounded border-white/20 bg-white/10 text-white focus:ring-0 cursor-pointer"
                      />
                    </label>
                  </div>
                  {form.showCardCity && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Display Value</label>
                        <Input
                          value={form.cardCityValue}
                          onChange={(e) => update("cardCityValue")(e.target.value)}
                          placeholder="Mysuru"
                          disabled={!canManage}
                          className="bg-white/[0.03] border-white/10 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Card Label</label>
                        <Input
                          value={form.cardCityLabel}
                          onChange={(e) => update("cardCityLabel")(e.target.value)}
                          placeholder="Active City"
                          disabled={!canManage}
                          className="bg-white/[0.03] border-white/10 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Subtitle / Note</label>
                        <Input
                          value={form.cardCityDesc}
                          onChange={(e) => update("cardCityDesc")(e.target.value)}
                          placeholder="Local delivery zones"
                          disabled={!canManage}
                          className="bg-white/[0.03] border-white/10 text-white text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 3: Registration Fee */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
                      Card 3: Registration Fee
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-300">
                      <span>{form.showCardFee ? "Enabled (Visible)" : "Disabled (Hidden)"}</span>
                      <input
                        type="checkbox"
                        checked={form.showCardFee}
                        onChange={(e) => update("showCardFee")(e.target.checked)}
                        disabled={!canManage}
                        className="h-4 w-4 rounded border-white/20 bg-white/10 text-white focus:ring-0 cursor-pointer"
                      />
                    </label>
                  </div>
                  {form.showCardFee && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Display Value</label>
                        <Input
                          value={form.cardFeeValue}
                          onChange={(e) => update("cardFeeValue")(e.target.value)}
                          placeholder="₹0 Free"
                          disabled={!canManage}
                          className="bg-white/[0.03] border-white/10 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Card Label</label>
                        <Input
                          value={form.cardFeeLabel}
                          onChange={(e) => update("cardFeeLabel")(e.target.value)}
                          placeholder="Registration Fee"
                          disabled={!canManage}
                          className="bg-white/[0.03] border-white/10 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Subtitle / Note</label>
                        <Input
                          value={form.cardFeeDesc}
                          onChange={(e) => update("cardFeeDesc")(e.target.value)}
                          placeholder="No upfront fees"
                          disabled={!canManage}
                          className="bg-white/[0.03] border-white/10 text-white text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 4: Vehicles Welcome */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Bike className="h-3.5 w-3.5 text-zinc-400" />
                      Card 4: Vehicles Welcome
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-300">
                      <span>{form.showCardVehicles ? "Enabled (Visible)" : "Disabled (Hidden)"}</span>
                      <input
                        type="checkbox"
                        checked={form.showCardVehicles}
                        onChange={(e) => update("showCardVehicles")(e.target.checked)}
                        disabled={!canManage}
                        className="h-4 w-4 rounded border-white/20 bg-white/10 text-white focus:ring-0 cursor-pointer"
                      />
                    </label>
                  </div>
                  {form.showCardVehicles && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Display Value</label>
                        <Input
                          value={form.cardVehiclesValue}
                          onChange={(e) => update("cardVehiclesValue")(e.target.value)}
                          placeholder="Bikes & EVs"
                          disabled={!canManage}
                          className="bg-white/[0.03] border-white/10 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Card Label</label>
                        <Input
                          value={form.cardVehiclesLabel}
                          onChange={(e) => update("cardVehiclesLabel")(e.target.value)}
                          placeholder="Vehicles Welcome"
                          disabled={!canManage}
                          className="bg-white/[0.03] border-white/10 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-400 block mb-1">Subtitle / Note</label>
                        <Input
                          value={form.cardVehiclesDesc}
                          onChange={(e) => update("cardVehiclesDesc")(e.target.value)}
                          placeholder="Bicycles welcome"
                          disabled={!canManage}
                          className="bg-white/[0.03] border-white/10 text-white text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Live Real-Time Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="sticky top-20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Eye className="h-3.5 w-3.5 text-zinc-400" />
                  Live Delivery App Preview
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Real-time sync
                </span>
              </div>

              {/* Preview Container */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#07070a] overflow-hidden shadow-2xl">
                {/* 1. Preview Navbar */}
                <div className="px-4 py-3 border-b border-white/[0.08] bg-[#07070a]/90 backdrop-blur-md flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {form.brandLogoUrl.trim() ? (
                      <img
                        src={form.brandLogoUrl}
                        alt="Logo"
                        className="h-7 w-7 object-contain rounded-md"
                        onError={(e) => {
                          (e.target as any).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-white">
                        <Truck className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-white">
                          {form.brandName || "AtlasBasket Delivery"}
                        </span>
                        <span className="text-[9px] font-medium text-white/50 px-1 py-0.2 rounded border border-white/10 bg-white/[0.03]">
                          Delivery
                        </span>
                      </div>
                      <span className="text-[9px] text-white/40 block font-mono -mt-0.5">
                        {form.activeCity || "Mysuru"} Fleet
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-zinc-400 px-2 py-1 rounded">Log In</span>
                    <span className="text-[10px] font-medium px-2 py-1 rounded-md bg-white text-zinc-950 font-semibold">
                      Become a Rider
                    </span>
                  </div>
                </div>

                {/* 2. Preview Hero Section */}
                <div className="p-6 text-center space-y-4 relative overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300 text-[10px] font-medium">
                    <Sparkles className="h-2.5 w-2.5 text-zinc-400" />
                    <span>{form.heroBadgeText || "Now Launching"}</span>
                  </div>

                  {/* Heading */}
                  <h3 className="text-xl font-bold tracking-tight text-white leading-tight">
                    {form.heroHeadingLine1 || "Deliver locally."} <br />
                    <span className="text-zinc-400 font-medium">
                      {form.heroHeadingLine2 || "Earn directly with every trip."}
                    </span>
                  </h3>

                  {/* Description */}
                  <p className="text-[11px] text-zinc-400 leading-relaxed max-w-sm mx-auto line-clamp-3">
                    {form.heroDescription}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <span className="px-3 py-1.5 rounded-lg bg-white text-zinc-950 text-xs font-semibold inline-flex items-center gap-1">
                      Register as a Rider
                      <ArrowRight className="h-3 w-3" />
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs font-medium">
                      Rider Sign In
                    </span>
                  </div>

                  {/* 3. Preview Stat Cards */}
                  <div className="grid grid-cols-2 gap-2 pt-4">
                    {form.showCardPayout && (
                      <div className="p-2.5 rounded-xl text-left bg-white/[0.025] border border-white/[0.08]">
                        <div className="text-sm font-bold text-white">{form.cardPayoutValue}</div>
                        <div className="text-[10px] font-medium text-zinc-300 mt-0.5">{form.cardPayoutLabel}</div>
                        <div className="text-[9px] text-zinc-500 mt-0.5">{form.cardPayoutDesc}</div>
                      </div>
                    )}

                    {form.showCardCity && (
                      <div className="p-2.5 rounded-xl text-left bg-white/[0.025] border border-white/[0.08]">
                        <div className="text-sm font-bold text-white">{form.cardCityValue}</div>
                        <div className="text-[10px] font-medium text-zinc-300 mt-0.5">{form.cardCityLabel}</div>
                        <div className="text-[9px] text-zinc-500 mt-0.5">{form.cardCityDesc}</div>
                      </div>
                    )}

                    {form.showCardFee && (
                      <div className="p-2.5 rounded-xl text-left bg-white/[0.025] border border-white/[0.08]">
                        <div className="text-sm font-bold text-white">{form.cardFeeValue}</div>
                        <div className="text-[10px] font-medium text-zinc-300 mt-0.5">{form.cardFeeLabel}</div>
                        <div className="text-[9px] text-zinc-500 mt-0.5">{form.cardFeeDesc}</div>
                      </div>
                    )}

                    {form.showCardVehicles && (
                      <div className="p-2.5 rounded-xl text-left bg-white/[0.025] border border-white/[0.08]">
                        <div className="text-sm font-bold text-white">{form.cardVehiclesValue}</div>
                        <div className="text-[10px] font-medium text-zinc-300 mt-0.5">{form.cardVehiclesLabel}</div>
                        <div className="text-[9px] text-zinc-500 mt-0.5">{form.cardVehiclesDesc}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Note */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Direct Database Integration
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  Settings are written directly to <code>DeliveryGlobalSetting</code> table. When riders or public visitors load the delivery app, updates reflect immediately with automated cache invalidation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
