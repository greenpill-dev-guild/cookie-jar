import { AdminPanel } from "@/components/admin-panel"

export default function AdminPage() {
  return (
    <main className="section-container py-8 cream-bg">
      <h1 className="text-4xl font-bold mb-8 text-[#4a3520]">ADMIN PANEL</h1>
      <p className="text-xl text-[#4a3520] mb-8">
        As a super admin (fee collector), you can blacklist spam cookie jars and their owner addresses.
      </p>
      <AdminPanel />
    </main>
  )
}

