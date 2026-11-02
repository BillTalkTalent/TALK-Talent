import VendorLoginForm from "./vendor-login-form";
import { CheckCircle2 } from "lucide-react";

const benefits = [
  "Manage your listing — logo, description, contact info",
  "Post updates TALK members see on your listing",
  "Track listing views and engagement",
  "See sponsorship opportunities as they open up",
];

export default function VendorPortalLoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — hidden on mobile */}
      <div
        className="hidden md:flex md:w-2/5 flex-col justify-between p-12"
        style={{ background: "linear-gradient(160deg, #0F1F35 0%, #162D4A 55%, #1A3A5C 100%)" }}
      >
        <div className="flex flex-col gap-3">
          <span
            style={{
              fontFamily: "var(--font-poppins), system-ui",
              fontWeight: 900,
              fontSize: "2.75rem",
              lineHeight: 1,
              letterSpacing: "-0.03em",
              display: "inline-flex",
              alignItems: "baseline",
            }}
          >
            <span style={{ color: "#E8503A" }}>TA</span>
            <span style={{ color: "white" }}>LK</span>
          </span>
          <p className="text-sm text-white/50 font-medium">Vendor Partner Portal</p>
        </div>

        <div className="flex flex-col gap-5">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-3">
              <CheckCircle2 className="size-5 shrink-0" style={{ color: "#93C5FD" }} />
              <span className="text-base text-white/90">{benefit}</span>
            </div>
          ))}
        </div>

        <p className="text-sm text-white/35">Use the email your TALK contact invited to manage your listing.</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-8" style={{ background: "#F5F8FC" }}>
        <div className="w-full max-w-sm space-y-8">
          <div className="md:hidden flex flex-col items-center gap-2">
            <span
              style={{
                fontFamily: "var(--font-poppins), system-ui",
                fontWeight: 900,
                fontSize: "1.75rem",
                lineHeight: 1,
                letterSpacing: "-0.03em",
                display: "inline-flex",
                alignItems: "baseline",
              }}
            >
              <span style={{ color: "#E8503A" }}>TA</span>
              <span style={{ color: "#0F1F35" }}>LK</span>
            </span>
            <p className="text-xs text-zinc-400 font-medium">Vendor Partner Portal</p>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-zinc-900">Vendor Partner Portal</h1>
            <p className="text-sm text-zinc-500">Manage your listing and post updates for TALK members.</p>
          </div>

          <VendorLoginForm />
        </div>
      </div>
    </div>
  );
}
