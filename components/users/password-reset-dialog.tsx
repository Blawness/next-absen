"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Copy, Check, Key } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface PasswordResetDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    userId: string
    userName: string
    onSuccess?: () => void
}

export function PasswordResetDialog({
    open,
    onOpenChange,
    userId,
    userName,
    onSuccess
}: PasswordResetDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [customPassword, setCustomPassword] = useState("")
    const [sendEmail, setSendEmail] = useState(false)
    const [useCustomPassword, setUseCustomPassword] = useState(false)
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleReset = () => {
        setCustomPassword("")
        setSendEmail(false)
        setUseCustomPassword(false)
        setGeneratedPassword(null)
        setCopied(false)
        setMessage(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)
        setGeneratedPassword(null)

        try {
            const response = await fetch(`/api/users/${userId}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customPassword: useCustomPassword ? customPassword : undefined,
                    sendEmail
                }),
            })

            if (response.ok) {
                const data = await response.json()
                setMessage({ type: 'success', text: data.message })

                if (data.temporaryPassword) {
                    setGeneratedPassword(data.temporaryPassword)
                }

                if (onSuccess) {
                    onSuccess()
                }

                // Auto close after 5 seconds if email was sent
                if (sendEmail) {
                    setTimeout(() => {
                        onOpenChange(false)
                        handleReset()
                    }, 3000)
                }
            } else {
                const error = await response.json()
                setMessage({ type: 'error', text: error.error || 'Failed to reset password' })
            }
        } catch {
            setMessage({ type: 'error', text: 'An error occurred' })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCopy = async () => {
        if (generatedPassword) {
            await navigator.clipboard.writeText(generatedPassword)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleClose = () => {
        onOpenChange(false)
        handleReset()
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px] bg-gray-900/95 backdrop-blur-md border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        Reset Password
                    </DialogTitle>
                    <DialogDescription className="text-white/70">
                        Reset password for <span className="font-semibold text-white">{userName}</span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Custom Password Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <Label htmlFor="use-custom" className="text-white/80 cursor-pointer">
                            Use custom password
                        </Label>
                        <Switch
                            id="use-custom"
                            checked={useCustomPassword}
                            onCheckedChange={setUseCustomPassword}
                        />
                    </div>

                    {/* Custom Password Input */}
                    {useCustomPassword && (
                        <div className="space-y-2">
                            <Label htmlFor="custom-password" className="text-white/80">
                                Custom Password
                            </Label>
                            <Input
                                id="custom-password"
                                type="password"
                                value={customPassword}
                                onChange={(e) => setCustomPassword(e.target.value)}
                                placeholder="Enter custom password"
                                required={useCustomPassword}
                                minLength={8}
                                className="bg-white/10 border-white/20 text-white"
                            />
                            <p className="text-xs text-white/60">Minimum 8 characters</p>
                        </div>
                    )}

                    {/* Send Email Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <div>
                            <Label htmlFor="send-email" className="text-white/80 cursor-pointer">
                                Send email notification
                            </Label>
                            <p className="text-xs text-white/60 mt-1">
                                {sendEmail ? "Password will be sent via email" : "Password will be displayed here"}
                            </p>
                        </div>
                        <Switch
                            id="send-email"
                            checked={sendEmail}
                            onCheckedChange={setSendEmail}
                        />
                    </div>

                    {/* Generated Password Display */}
                    {generatedPassword && (
                        <Alert className="bg-green-500/10 border-green-500/20">
                            <AlertDescription className="space-y-2">
                                <p className="text-white/80 text-sm font-medium">Temporary Password:</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 bg-black/30 px-3 py-2 rounded text-white font-mono text-sm">
                                        {generatedPassword}
                                    </code>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCopy}
                                        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                                    >
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <p className="text-xs text-white/60">
                                    Make sure to save this password. It won&apos;t be shown again.
                                </p>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Message Alert */}
                    {message && (
                        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
                            <AlertDescription>{message.text}</AlertDescription>
                        </Alert>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                        >
                            {generatedPassword ? 'Close' : 'Cancel'}
                        </Button>
                        {!generatedPassword && (
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                variant="glass"
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Reset Password
                            </Button>
                        )}
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
