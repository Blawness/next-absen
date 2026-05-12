import { NextResponse } from "next/server"

export class HttpError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

type RouteHandler = (...args: any[]) => Promise<NextResponse>

export function withErrorHandling(handler: RouteHandler, operation: string): RouteHandler {
  return async (...args: any[]) => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      console.error(`Error during ${operation}:`, error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}
