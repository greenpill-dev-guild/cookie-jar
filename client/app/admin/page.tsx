import { AdminDashboard } from "@/components/admin-dashboard"
import { AdminAccessGuard } from "@/components/admin-access-guard"

export default function AdminPage() {
  return (
    <AdminAccessGuard>
      <div className="min-h-screen py-8 bg-[#2c1e10]">
        <div className="section-container">
          <AdminDashboard />
        </div>
      </div>
    </AdminAccessGuard>
  )
}

