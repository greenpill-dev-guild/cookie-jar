"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Ban, CheckCircle2, Search, Shield, User } from "lucide-react"

// Mock data for users
const mockUsers = [
  {
    id: "1",
    address: "0x1234...5678",
    ensName: "alice.eth",
    isAdmin: false,
    isBlacklisted: false,
    jarAccess: 2,
    lastActivity: "2023-08-15",
  },
  {
    id: "2",
    address: "0xabcd...ef01",
    ensName: null,
    isAdmin: false,
    isBlacklisted: true,
    jarAccess: 0,
    lastActivity: "2023-07-22",
  },
  {
    id: "3",
    address: "0x603f...02A6",
    ensName: "blocke.eth",
    isAdmin: true,
    isBlacklisted: false,
    jarAccess: 4,
    lastActivity: "2023-08-20",
  },
  {
    id: "4",
    address: "0x4567...8901",
    ensName: null,
    isAdmin: false,
    isBlacklisted: false,
    jarAccess: 1,
    lastActivity: "2023-08-10",
  },
]

export function AdminUserManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Filter users based on search and filters
  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch =
      user.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.ensName && user.ensName.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "admin" && user.isAdmin) ||
      (statusFilter === "blacklisted" && user.isBlacklisted) ||
      (statusFilter === "regular" && !user.isAdmin && !user.isBlacklisted)

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <Card className="bg-[#231811] border-none">
        <CardHeader>
          <CardTitle className="text-[#ff8e14] text-2xl">User Management</CardTitle>
          <CardDescription className="text-[#a89a8c]">Manage users, admins, and blacklisted addresses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#a89a8c]" />
              <Input
                placeholder="Search by address or ENS name..."
                className="pl-10 bg-[#3c2a14] border-none text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
                className={
                  statusFilter === "all" ? "bg-[#ff5e14] hover:bg-[#ff5e14]/90" : "border-[#4a3520] text-[#a89a8c]"
                }
              >
                All
              </Button>
              <Button
                variant={statusFilter === "admin" ? "default" : "outline"}
                onClick={() => setStatusFilter("admin")}
                className={
                  statusFilter === "admin" ? "bg-[#ff5e14] hover:bg-[#ff5e14]/90" : "border-[#4a3520] text-[#a89a8c]"
                }
              >
                Admins
              </Button>
              <Button
                variant={statusFilter === "blacklisted" ? "default" : "outline"}
                onClick={() => setStatusFilter("blacklisted")}
                className={
                  statusFilter === "blacklisted"
                    ? "bg-[#ff5e14] hover:bg-[#ff5e14]/90"
                    : "border-[#4a3520] text-[#a89a8c]"
                }
              >
                Blacklisted
              </Button>
              <Button
                variant={statusFilter === "regular" ? "default" : "outline"}
                onClick={() => setStatusFilter("regular")}
                className={
                  statusFilter === "regular" ? "bg-[#ff5e14] hover:bg-[#ff5e14]/90" : "border-[#4a3520] text-[#a89a8c]"
                }
              >
                Regular
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-[#4a3520] overflow-hidden">
            <Table>
              <TableHeader className="bg-[#3c2a14]">
                <TableRow className="hover:bg-[#3c2a14]/80 border-b-[#4a3520]">
                  <TableHead className="text-[#ff8e14]">Address</TableHead>
                  <TableHead className="text-[#ff8e14]">ENS Name</TableHead>
                  <TableHead className="text-[#ff8e14]">Status</TableHead>
                  <TableHead className="text-[#ff8e14]">Jar Access</TableHead>
                  <TableHead className="text-[#ff8e14]">Last Activity</TableHead>
                  <TableHead className="text-[#ff8e14]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-[#3c2a14]/50 border-b-[#4a3520]">
                    <TableCell className="font-medium text-white">{user.address}</TableCell>
                    <TableCell className="text-[#a89a8c]">{user.ensName || "-"}</TableCell>
                    <TableCell>
                      {user.isAdmin && <Badge className="bg-[#ff5e14] text-white border-none">Admin</Badge>}
                      {user.isBlacklisted && <Badge className="bg-red-600 text-white border-none">Blacklisted</Badge>}
                      {!user.isAdmin && !user.isBlacklisted && (
                        <Badge className="bg-green-600 text-white border-none">Regular</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-[#a89a8c]">{user.jarAccess} jars</TableCell>
                    <TableCell className="text-[#a89a8c]">{user.lastActivity}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {!user.isAdmin && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-[#a89a8c] hover:text-white hover:bg-[#3c2a14]"
                              >
                                <Shield className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#231811] text-white border-[#4a3520]">
                              <DialogHeader>
                                <DialogTitle className="text-[#ff8e14]">Make Admin</DialogTitle>
                                <DialogDescription className="text-[#a89a8c]">
                                  Are you sure you want to make this user an admin? They will have full access to all
                                  jars and admin features.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button className="bg-[#ff5e14] hover:bg-[#ff5e14]/90 text-white">Make Admin</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}

                        {!user.isBlacklisted ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-400 hover:bg-[#3c2a14]"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#231811] text-white border-[#4a3520]">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-[#ff8e14]">Blacklist User</AlertDialogTitle>
                                <AlertDialogDescription className="text-[#a89a8c]">
                                  Are you sure you want to blacklist this user? They will not be able to access any
                                  jars.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-[#3c2a14] text-white hover:bg-[#4a3520] border-none">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700">
                                  Blacklist
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-500 hover:text-green-400 hover:bg-[#3c2a14]"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-[#a89a8c]">
                      No users found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#231811] border-none">
        <CardHeader>
          <CardTitle className="text-[#ff8e14] text-2xl">User Statistics</CardTitle>
          <CardDescription className="text-[#a89a8c]">Overview of user activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#3c2a14] p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#a89a8c]">Total Users</p>
                  <h3 className="text-3xl font-bold text-white">{mockUsers.length}</h3>
                </div>
                <User className="h-10 w-10 text-[#ff5e14]" />
              </div>
            </div>
            <div className="bg-[#3c2a14] p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#a89a8c]">Admin Users</p>
                  <h3 className="text-3xl font-bold text-white">{mockUsers.filter((u) => u.isAdmin).length}</h3>
                </div>
                <Shield className="h-10 w-10 text-[#ff5e14]" />
              </div>
            </div>
            <div className="bg-[#3c2a14] p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#a89a8c]">Blacklisted Users</p>
                  <h3 className="text-3xl font-bold text-white">{mockUsers.filter((u) => u.isBlacklisted).length}</h3>
                </div>
                <Ban className="h-10 w-10 text-red-500" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

