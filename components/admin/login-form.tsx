'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login, type LoginState } from '@/lib/actions/auth'

/**
 * Sign-in form.
 *
 * Uses `useActionState` so the form works before hydration and errors come back
 * from the server rather than being guessed at in the browser. The old form asked
 * for a "username" while its own description said "enter your email".
 */
export function LoginForm({ next }: { next?: string }) {
  const router = useRouter()
  const [state, formAction] = useActionState<LoginState | undefined, FormData>(login, undefined)

  // React 19 resets an uncontrolled form after its action settles. Left alone that
  // wipes the email as well as the password on a failed sign-in, forcing the user
  // to retype both. Holding the email in state keeps it across attempts.
  const [email, setEmail] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!state?.ok) {
      if (state?.message) {
        toast.error(state.message)
        // Put the cursor where the correction is most likely needed.
        passwordRef.current?.focus()
      }
      return
    }

    // Only same-origin absolute paths are followed, so `?next=//evil.example`
    // cannot turn the login screen into an open redirect.
    const destination = next && /^\/(?!\/)[\w\-./?=&%]*$/.test(next) ? next : '/admin'
    router.replace(destination)
    router.refresh()
  }, [state, next, router])

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h1 className="text-xl">Sign in</h1>
        </CardTitle>
        <CardDescription>Enter your administrator email and password.</CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(state?.fieldErrors?.email)}
              aria-describedby={state?.fieldErrors?.email ? 'email-error' : undefined}
              placeholder="you@example.com"
            />
            {state?.fieldErrors?.email && (
              <p id="email-error" className="text-destructive text-xs">
                {state.fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              ref={passwordRef}
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={Boolean(state?.fieldErrors?.password)}
              aria-describedby={state?.fieldErrors?.password ? 'password-error' : undefined}
            />
            {state?.fieldErrors?.password && (
              <p id="password-error" className="text-destructive text-xs">
                {state.fieldErrors.password}
              </p>
            )}
          </div>

          {state && !state.ok && state.message && (
            <p role="alert" className="text-destructive text-sm">
              {state.message}
            </p>
          )}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2Icon className="animate-spin" />}
      {pending ? 'Signing in…' : 'Sign in'}
    </Button>
  )
}
