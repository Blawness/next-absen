import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"
import {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    HttpError,
} from "./services"

// Mock dependencies
jest.mock("@/lib/prisma", () => {
    const client: Record<string, unknown> = {
        user: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
        },
        activityLog: {
            create: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
        },
        persistedSessionToken: {
            updateMany: jest.fn(),
        },
    }
    // Hand the callback the same mocked client, so assertions on
    // prisma.user.update still see calls made inside a transaction.
    client.$transaction = jest.fn((cb: (tx: unknown) => unknown) => cb(client))
    return { prisma: client }
})

jest.mock("bcryptjs", () => ({
    hash: jest.fn(),
}))

describe("User Management Service", () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    describe("getUsers", () => {
        it("should throw error if user is not admin or manager", async () => {
            await expect(
                getUsers({ id: "user1", role: "user" })
            ).rejects.toThrow(HttpError)
        })

        it("should return users for admin", async () => {
            const mockUsers = [{ id: "1", name: "User 1" }]
                ; (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers)

            const result = await getUsers({ id: "admin1", role: UserRole.admin })
            expect(result).toEqual(mockUsers)
            expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {}
            }))
        })

        it("should return all users for manager (no department filter)", async () => {
            const mockUsers = [{ id: "1", name: "User 1" }]

                ; (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers)

            const result = await getUsers({ id: "manager1", role: UserRole.manager })

            expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {}
            }))
            expect(result).toEqual(mockUsers)
        })
    })

    describe("createUser", () => {
        const validData = {
            name: "New User",
            email: "new@example.com",
            password: "password123",
            role: UserRole.user,
            department: "IT",
            position: "Dev"
        }

        it("should throw error if not admin", async () => {
            await expect(
                createUser({ id: "manager1", role: UserRole.manager }, validData)
            ).rejects.toThrow(HttpError)
        })

        it("should throw error if missing fields", async () => {
            await expect(
                createUser({ id: "admin1", role: UserRole.admin }, { ...validData, email: "" })
            ).rejects.toThrow("Missing required fields")
        })

        it("should throw error if email exists", async () => {
            ; (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "existing" })

            await expect(
                createUser({ id: "admin1", role: UserRole.admin }, validData)
            ).rejects.toThrow("Email already exists")
        })

        it("should create user and log activity", async () => {
            ; (prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
                ; (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_password")
                ; (prisma.user.create as jest.Mock).mockResolvedValue({ ...validData, id: "new-id" })

            const result = await createUser({ id: "admin1", role: UserRole.admin }, validData)

            expect(bcrypt.hash).toHaveBeenCalledWith("password123", 12)
            expect(prisma.user.create).toHaveBeenCalled()
            expect(prisma.activityLog.create).toHaveBeenCalled()
            expect(result).toEqual(expect.objectContaining({ id: "new-id" }))
        })

        // BUG-007 — privilege escalation guard
        it("should reject admin trying to create a superadmin (BUG-007)", async () => {
            await expect(
                createUser(
                    { id: "admin1", role: UserRole.admin },
                    { ...validData, role: UserRole.superadmin }
                )
            ).rejects.toThrow(/Cannot assign role "superadmin"/)
        })

        it("should allow superadmin to create another superadmin", async () => {
            ; (prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
                ; (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_password")
                ; (prisma.user.create as jest.Mock).mockResolvedValue({ ...validData, id: "new-id", role: UserRole.superadmin })

            const result = await createUser(
                { id: "super1", role: UserRole.superadmin },
                { ...validData, role: UserRole.superadmin }
            )
            expect(result).toEqual(expect.objectContaining({ id: "new-id" }))
        })

        it("should translate a P2002 unique-constraint error into a clean email message", async () => {
            // Pre-check passes (no existing user) but a concurrent insert
            // beats us. The DB raises P2002 and we must catch it gracefully.
            ; (prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
                ; (bcrypt.hash as jest.Mock).mockResolvedValue("hashed")
            const p2002 = Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
                ; (prisma.user.create as jest.Mock).mockRejectedValue(p2002)

            await expect(
                createUser({ id: "admin1", role: UserRole.admin }, validData)
            ).rejects.toThrow("Email already exists")
        })
    })

    describe("updateUser", () => {
        const updateData = {
            name: "Updated Name",
            email: "updated@example.com",
            role: UserRole.user
        }

        it("should throw error if not admin", async () => {
            await expect(
                updateUser({ id: "manager1", role: UserRole.manager }, "user1", updateData)
            ).rejects.toThrow(HttpError)
        })

        it("should throw error if user not found", async () => {
            ; (prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

            await expect(
                updateUser({ id: "admin1", role: UserRole.admin }, "user1", updateData)
            ).rejects.toThrow("User not found")
        })

        it("should throw error if email taken by another user", async () => {
            (prisma.user.findUnique as jest.Mock).mockImplementation((args) => {
                if (args.where.id === "user1") return Promise.resolve({ id: "user1", email: "old@example.com" });
                if (args.where.email === "updated@example.com") return Promise.resolve({ id: "other" });
                return Promise.resolve(null);
            });

            await expect(
                updateUser({ id: "admin1", role: UserRole.admin }, "user1", updateData)
            ).rejects.toThrow("Email already exists")
        })

        it("should update user and log activity", async () => {
            (prisma.user.findUnique as jest.Mock).mockImplementation((args) => {
                if (args.where.id === "user1") return Promise.resolve({ id: "user1", email: "old@example.com" });
                if (args.where.email === "updated@example.com") return Promise.resolve(null);
                return Promise.resolve(null);
            });

            ; (prisma.user.update as jest.Mock).mockResolvedValue({ ...updateData, id: "user1" })

            const result = await updateUser({ id: "admin1", role: UserRole.admin }, "user1", updateData)

            expect(prisma.user.update).toHaveBeenCalled()
            expect(prisma.activityLog.create).toHaveBeenCalled()
            expect(result).toEqual(expect.objectContaining({ name: "Updated Name" }))
        })

        it("should ignore stray password field — use reset-password route instead", async () => {
            // Password updates are intentionally NOT allowed via updateUser.
            // They must go through /api/users/[id]/reset-password so the
            // dedicated RESET_PASSWORD audit log entry is written.
            (prisma.user.findUnique as jest.Mock).mockImplementation((args) => {
                if (args.where.id === "user1") return Promise.resolve({ id: "user1", email: "old@example.com" });
                if (args.where.email === "updated@example.com") return Promise.resolve(null);
                return Promise.resolve(null);
            });
            (prisma.user.update as jest.Mock).mockResolvedValue({ ...updateData, id: "user1" });

            // Cast to any so we can attempt to pass a password even though
            // the schema no longer allows it — this verifies the service
            // strips it.
            await updateUser(
              { id: "admin1", role: UserRole.admin },
              "user1",
              { ...updateData, password: "newpassword" } as any,
            );

            expect(bcrypt.hash).not.toHaveBeenCalled();
            expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.not.objectContaining({
                    password: expect.anything()
                })
            }));
        })

        // BUG-007 — privilege escalation guard
        it("should reject admin trying to promote user to superadmin (BUG-007)", async () => {
            await expect(
                updateUser(
                    { id: "admin1", role: UserRole.admin },
                    "user1",
                    { ...updateData, role: UserRole.superadmin }
                )
            ).rejects.toThrow(/Cannot assign role "superadmin"/)
        })

        it("should allow superadmin to promote a user to superadmin", async () => {
            (prisma.user.findUnique as jest.Mock).mockImplementation((args) => {
                if (args.where.id === "user1") return Promise.resolve({ id: "user1", email: "old@example.com" });
                if (args.where.email === "updated@example.com") return Promise.resolve(null);
                return Promise.resolve(null);
            });
            (prisma.user.update as jest.Mock).mockResolvedValue({ ...updateData, id: "user1", role: UserRole.superadmin });

            const result = await updateUser(
                { id: "super1", role: UserRole.superadmin },
                "user1",
                { ...updateData, role: UserRole.superadmin }
            )
            expect(result.role).toBe(UserRole.superadmin)
        })
    })

    describe("deleteUser", () => {
        it("should throw error if not admin", async () => {
            await expect(
                deleteUser({ id: "manager1", role: UserRole.manager }, "user1")
            ).rejects.toThrow(HttpError)
        })

        it("should throw error if trying to delete self", async () => {
            ; (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "admin1" })

            await expect(
                deleteUser({ id: "admin1", role: UserRole.admin }, "admin1")
            ).rejects.toThrow("Cannot delete your own account")
        })

        it("should soft delete user and log activity", async () => {
            ; (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user1", email: "user@example.com" })
                ; (prisma.user.update as jest.Mock).mockResolvedValue({ id: "user1", isActive: false })

            const result = await deleteUser({ id: "admin1", role: UserRole.admin }, "user1")

            expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: "user1" },
                data: { isActive: false }
            }))
            expect(prisma.activityLog.create).toHaveBeenCalled()
            expect(result.isActive).toBe(false)
        })

        it("should reject admin trying to soft-delete a superadmin (privilege escalation)", async () => {
            ; (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: "super1", email: "super@x", role: UserRole.superadmin,
            })
            await expect(
                deleteUser({ id: "admin1", role: UserRole.admin }, "super1")
            ).rejects.toThrow(/Insufficient permissions to delete a superadmin/)
        })
    })

    describe("session revocation", () => {
        const revokeMock = () =>
            (prisma as unknown as {
                persistedSessionToken: { updateMany: jest.Mock }
            }).persistedSessionToken.updateMany

        const mockLookups = (currentEmail: string, newEmail: string) => {
            ; (prisma.user.findUnique as jest.Mock).mockImplementation((args) => {
                if (args.where.id === "user1")
                    return Promise.resolve({ id: "user1", email: currentEmail })
                if (args.where.email === newEmail) return Promise.resolve(null)
                return Promise.resolve(null)
            })
            ; (prisma.user.update as jest.Mock).mockResolvedValue({ id: "user1" })
        }

        it("revokes every active session when a user's email changes", async () => {
            mockLookups("old@example.com", "new@example.com")

            await updateUser({ id: "admin1", role: UserRole.admin }, "user1", {
                name: "N", email: "new@example.com", role: UserRole.user,
            })

            expect(revokeMock()).toHaveBeenCalledWith({
                where: { userId: "user1", revokedAt: null },
                data: { revokedAt: expect.any(Date) },
            })
        })

        it("leaves sessions alone when the email is unchanged", async () => {
            mockLookups("same@example.com", "same@example.com")

            await updateUser({ id: "admin1", role: UserRole.admin }, "user1", {
                name: "Renamed", email: "same@example.com", role: UserRole.manager,
            })

            expect(revokeMock()).not.toHaveBeenCalled()
        })

        it("revokes every active session when an admin resets a password", async () => {
            ; (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: "user1", email: "u@x.com", name: "U", role: UserRole.user,
            })
            ; (prisma.user.update as jest.Mock).mockResolvedValue({ id: "user1" })
            ; (bcrypt.hash as jest.Mock).mockResolvedValue("hashed")

            const { resetUserPassword } = require("./services")
            await resetUserPassword({ id: "admin1", role: UserRole.admin }, "user1")

            expect(revokeMock()).toHaveBeenCalledWith({
                where: { userId: "user1", revokedAt: null },
                data: { revokedAt: expect.any(Date) },
            })
        })
    })

    describe("privilege escalation guards", () => {
        const baseData = { name: "X", email: "x@x.com", role: UserRole.user }

        it("resetUserPassword: admin cannot reset a superadmin's password", async () => {
            ; (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: "super1", email: "super@x.com", name: "S", role: UserRole.superadmin,
            })
            const { resetUserPassword } = require("./services")
            await expect(
                resetUserPassword({ id: "admin1", role: UserRole.admin }, "super1")
            ).rejects.toThrow(/Cannot reset password for role "superadmin"/)
        })

        it("toggleUserStatus: admin cannot deactivate a superadmin", async () => {
            ; (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: "super1", email: "super@x.com", role: UserRole.superadmin,
            })
            const { toggleUserStatus } = require("./services")
            await expect(
                toggleUserStatus({ id: "admin1", role: UserRole.admin }, "super1", false)
            ).rejects.toThrow(/Insufficient permissions to deactivate a superadmin/)
        })

        it("bulkUserAction: admin cannot bulk-deactivate a superadmin", async () => {
            ; (prisma.user.findMany as jest.Mock).mockResolvedValue([
                { id: "admin2", role: UserRole.admin },
                { id: "super1", role: UserRole.superadmin },
            ])
            const { bulkUserAction } = require("./services")
            await expect(
                bulkUserAction(
                    { id: "admin1", role: UserRole.admin },
                    "deactivate",
                    ["admin2", "super1"]
                )
            ).rejects.toThrow(/Cannot deactivate user with role "superadmin"/)
        })

        it("bulkUserAction: admin can bulk-deactivate other admins", async () => {
            ; (prisma.user.findMany as jest.Mock).mockResolvedValue([
                { id: "admin2", role: UserRole.admin },
            ])
            ; (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "admin2", email: "admin2@x.com", isActive: true })
            ; (prisma.user.update as jest.Mock).mockResolvedValue({})
            const { bulkUserAction } = require("./services")
            const result = await bulkUserAction(
                { id: "admin1", role: UserRole.admin },
                "deactivate",
                ["admin2"]
            )
            expect(result.successCount).toBe(1)
        })

        it("getUserActivity: manager cannot view activity outside their department", async () => {
            ; (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: "target1", email: "t@x", name: "T", department: "Finance",
            })
            const { getUserActivity } = require("./services")
            await expect(
                getUserActivity(
                    { id: "mgr1", role: UserRole.manager, department: "IT" },
                    "target1",
                    {}
                )
            ).rejects.toThrow(/Insufficient permissions to view this user/)
        })

        it("getUserActivity: manager can view activity inside their department", async () => {
            ; (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: "target1", email: "t@x", name: "T", department: "IT",
            })
            ; (prisma.activityLog.findMany as jest.Mock).mockResolvedValue([])
            ; (prisma.activityLog.count as jest.Mock).mockResolvedValue(0)
            const { getUserActivity } = require("./services")
            const result = await getUserActivity(
                { id: "mgr1", role: UserRole.manager, department: "IT" },
                "target1",
                {}
            )
            expect(result.user.id).toBe("target1")
        })
    })
})
