import VendorLoginForm from "./vendor-login-form";

export default function VendorPortalLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#F5F8FC" }}>
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <span
            style={{ fontFamily: "var(--font-poppins), system-ui", fontWeight: 900, fontSize: "1.75rem", lineHeight: 1, letterSpacing: "-0.03em" }}
          >
            <span style={{ color: "#E8503A" }}>TA</span>
            <span style={{ color: "#0F1F35" }}>LK</span>
          </span>
          <h1 className="text-xl font-semibold text-zinc-900">Vendor Partner Portal</h1>
          <p className="text-sm text-zinc-500">Manage your listing and post updates for TALK members.</p>
        </div>
        <VendorLoginForm />
      </div>
    </div>
  );
}
