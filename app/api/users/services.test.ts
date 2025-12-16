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
jest.mock("@/lib/prisma", () => ({
    prisma: {
        user: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        activityLog: {
            create: jest.fn(),
        },
    },
}))

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

        it("should update password if provided", async () => {
            (prisma.user.findUnique as jest.Mock).mockImplementation((args) => {
                if (args.where.id === "user1") return Promise.resolve({ id: "user1", email: "old@example.com" });
                if (args.where.email === "updated@example.com") return Promise.resolve(null);
                return Promise.resolve(null);
            });
            (bcrypt.hash as jest.Mock).mockResolvedValue("new_hashed_password");
            (prisma.user.update as jest.Mock).mockResolvedValue({ ...updateData, id: "user1" });

            await updateUser({ id: "admin1", role: UserRole.admin }, "user1", { ...updateData, password: "newpassword" });

            expect(bcrypt.hash).toHaveBeenCalledWith("newpassword", 12);
            expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    password: "new_hashed_password"
                })
            }));
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
    })
})
