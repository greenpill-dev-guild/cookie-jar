"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminJarManagement } from "@/components/admin-jar-management"
import { AdminUserManagement } from "@/components/admin-user-management"
import { AdminSystemSettings } from "@/components/admin-system-settings"
import { AdminAnalytics } from "@/components/admin-analytics"

export function AdminDashboard() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-[#ff8e14] mb-8">Admin Dashboard</h1>

      <Tabs defaultValue="jars" className="w-full">
        <TabsList className="grid grid-cols-4 mb-8 bg-[#231811] rounded-xl h-14">
          <TabsTrigger
            value="jars"
            className="text-lg py-3 data-[state=active]:bg-[#3c2a14] data-[state=active]:text-white data-[state=inactive]:text-[#a89a8c] rounded-xl"
          >
            Jar Management
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="text-lg py-3 data-[state=active]:bg-[#3c2a14] data-[state=active]:text-white data-[state=inactive]:text-[#a89a8c] rounded-xl"
          >
            User Management
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="text-lg py-3 data-[state=active]:bg-[#3c2a14] data-[state=active]:text-white data-[state=inactive]:text-[#a89a8c] rounded-xl"
          >
            System Settings
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="text-lg py-3 data-[state=active]:bg-[#3c2a14] data-[state=active]:text-white data-[state=inactive]:text-[#a89a8c] rounded-xl"
          >
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jars">
          <AdminJarManagement />
        </TabsContent>

        <TabsContent value="users">
          <AdminUserManagement />
        </TabsContent>

        <TabsContent value="settings">
          <AdminSystemSettings />
        </TabsContent>

        <TabsContent value="analytics">
          <AdminAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  )
}

