"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Settings, LogOut, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { logout } from '@/lib/auth-utils'

export default function AdminHeader() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)

  // Auto logout duration in milliseconds (5 minutes)
  const AUTO_LOGOUT_DURATION = 6 * 60 * 1000

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Get cookie value
  const getCookie = useCallback((name: string) => {
    if (typeof document === 'undefined') return null
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift()
    return null
  }, [])

  // Set cookie value
  const setCookie = useCallback((name: string, value: string, maxAge: number) => {
    if (typeof document === 'undefined') return
    document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Strict`
  }, [])

  // Delete cookie
  const deleteCookie = useCallback((name: string) => {
    if (typeof document === 'undefined') return
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`
  }, [])

  // Clear all authentication data completely
  const clearAllAuthData = useCallback(() => {
    // Clear localStorage completely
    try {
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }
    
    // Clear sessionStorage completely
    try {
      sessionStorage.clear()
    } catch (error) {
      console.error('Error clearing sessionStorage:', error)
    }
    
    // Clear all auth-related cookies
    const authCookies = [
      'isAuthenticated', 'loginTime', 'user', 'userRole', 
      'userEmail', 'userId', 'authToken', 'sessionId'
    ]
    
    authCookies.forEach(cookieName => {
      deleteCookie(cookieName)
    })
    
    // Clear any other potential cookies
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';')
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
        if (name.toLowerCase().includes('auth') || 
            name.toLowerCase().includes('login') || 
            name.toLowerCase().includes('user') ||
            name.toLowerCase().includes('session')) {
          deleteCookie(name)
        }
      })
    }
  }, [deleteCookie])

  // Handle logout function with complete cleanup
  const handleLogout = useCallback(async (isAutoLogout = false) => {
    console.log(isAutoLogout ? "Auto logout triggered" : "Manual logout triggered")
    
    try {
      // Call logout API to clear server-side cookies
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      console.error('Error calling logout API:', error)
    }
    
    // Clear all authentication data
    clearAllAuthData()
    
    // Update state
    setIsAuthenticated(false)
    setTimeRemaining(0)
    
    // Call the logout utility function
    try {
      logout()
    } catch (error) {
      console.error('Error in logout utility:', error)
    }
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('authChange', { detail: { authenticated: false } }))
    window.dispatchEvent(new CustomEvent('logout', { detail: { isAutoLogout } }))
    
    // Force complete page reload to ensure clean state
    if (isAutoLogout) {
      setTimeout(() => {
        // Use replace to prevent back button issues
        window.location.replace('/?logout=true&reason=timeout')
      }, 100)
    } else {
      setTimeout(() => {
        window.location.replace('/?logout=true&reason=manual')
      }, 100)
    }
  }, [clearAllAuthData])

  // Check authentication status using cookies as primary source
  const checkAuthStatus = useCallback(() => {
    // Check cookies first (more reliable)
    const cookieAuth = getCookie('isAuthenticated') === 'true'
    const cookieLoginTime = getCookie('loginTime')
    
    // Check localStorage as fallback
    const localAuth = localStorage.getItem("isAuthenticated") === "true"
    const localLoginTime = localStorage.getItem("loginTime")
    
    // Use cookies if available, otherwise fallback to localStorage
    const authStatus = cookieAuth || localAuth
    const loginTime = cookieLoginTime || localLoginTime
    
    if (authStatus && loginTime) {
      const loginTimestamp = parseInt(loginTime, 10)
      const currentTime = Date.now()
      const elapsedTime = currentTime - loginTimestamp
      
      // Validate login timestamp
      if (isNaN(loginTimestamp) || loginTimestamp <= 0 || elapsedTime < 0) {
        console.log("Invalid login timestamp detected, logging out")
        handleLogout(true)
        return
      }
      
      // Check if session has expired
      if (elapsedTime >= AUTO_LOGOUT_DURATION) {
        console.log("Session expired - auto logout")
        handleLogout(true)
        return
      }
      
      // Update time remaining
      const remaining = AUTO_LOGOUT_DURATION - elapsedTime
      setTimeRemaining(Math.max(0, Math.ceil(remaining / 1000)))
      setIsAuthenticated(true)
      
      // Sync data between cookies and localStorage
      if (!cookieAuth && localAuth) {
        setCookie('isAuthenticated', 'true', Math.ceil(remaining / 1000))
      }
      if (!cookieLoginTime && localLoginTime) {
        setCookie('loginTime', localLoginTime, Math.ceil(remaining / 1000))
      }
      if (!localAuth && cookieAuth) {
        localStorage.setItem('isAuthenticated', 'true')
      }
      if (!localLoginTime && cookieLoginTime) {
        localStorage.setItem('loginTime', cookieLoginTime)
      }
    } else {
      setIsAuthenticated(false)
      setTimeRemaining(0)
    }
  }, [getCookie, setCookie, handleLogout])

  // Main authentication check effect
  useEffect(() => {
    if (!isClient) return

    // Initial check
    checkAuthStatus()
    
    // Set up interval to check every second
    const interval = setInterval(checkAuthStatus, 1000)
    
    // Add event listeners for storage and auth changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'isAuthenticated' || e.key === 'loginTime') {
        checkAuthStatus()
      }
    }
    
    const handleAuthChange = () => {
      setTimeout(checkAuthStatus, 100) // Small delay to ensure data is set
    }
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAuthStatus() // Check auth when tab becomes visible
      }
    }
    
    const handleFocus = () => {
      checkAuthStatus() // Check auth when window gains focus
    }
    
    // Add all event listeners
    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("authChange", handleAuthChange)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("authChange", handleAuthChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [isClient, checkAuthStatus])

  // Handle login time setting
  useEffect(() => {
    if (!isClient) return

    const handleLogin = () => {
      const authStatus = localStorage.getItem("isAuthenticated") === "true" || getCookie('isAuthenticated') === 'true'
      const existingLoginTime = localStorage.getItem("loginTime") || getCookie('loginTime')
      
      if (authStatus && !existingLoginTime) {
        const currentTime = Date.now()
        localStorage.setItem("loginTime", currentTime.toString())
        setCookie('loginTime', currentTime.toString(), 5 * 60) // 5 minutes
        console.log("Login time set:", new Date(currentTime).toLocaleString())
      }
    }

    handleLogin()

    const handleAuthChangeEvent = () => {
      setTimeout(handleLogin, 100)
    }
    
    window.addEventListener("authChange", handleAuthChangeEvent)
    
    return () => {
      window.removeEventListener("authChange", handleAuthChangeEvent)
    }
  }, [isClient, getCookie, setCookie])

  const handleManualLogout = () => {
    handleLogout(false)
  }

  const handleLogoClick = () => {
    router.push('/dashboard')
  }

  // Format time remaining for display
  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="cursor-pointer"
            onClick={handleLogoClick}
          >
            <Image
              src="/boc.png"
              alt="BOC Bank Logo"
              width={60}
              height={60}
              className=""
            />
          </motion.div>
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex flex-col"
          >
            <p className="text-lg text-stone-400 font-semibold">Meeting Management System</p>
          </motion.div>
        </div>

        {/* Only render auth-dependent content after client-side hydration */}
        {isClient && isAuthenticated && (
          <div className="flex items-center gap-4">
            {/* Session timer display */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium ${
                timeRemaining <= 60 
                  ? 'bg-red-100 text-red-700 border border-red-200' 
                  : timeRemaining <= 120 
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                  : 'bg-green-100 text-green-700 border border-green-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${
                timeRemaining <= 60 
                  ? 'bg-red-500 animate-pulse' 
                  : timeRemaining <= 120 
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`} />
              <span>
                Session: {formatTimeRemaining(timeRemaining)}
              </span>
            </motion.div>

            <motion.button
              onClick={handleManualLogout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </motion.button>
          </div>
        )}
      </div>
    </motion.header>
  )
}
