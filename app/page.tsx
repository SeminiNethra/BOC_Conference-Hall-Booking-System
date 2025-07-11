"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  Lock, 
  User, 
  AlertCircle, 
  Building2, 
  Mail, 
  UserPlus, 
  LogIn, 
  ArrowRight, 
  KeyRound,
  EyeIcon,
  EyeOffIcon,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

export default function AuthPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [loading, setLoading] = useState(false);
  
  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });
  
  // Register form state
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  
  // Form errors
  const [loginErrors, setLoginErrors] = useState({ email: "", password: "" });
  const [registerErrors, setRegisterErrors] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  // Password strength indicator
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  // Background animation
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Validate login form
  const validateLoginForm = () => {
    const errors = { email: "", password: "" };
    let isValid = true;
    
    if (!loginData.email) {
      errors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(loginData.email)) {
      errors.email = "Email is invalid";
      isValid = false;
    }
    
    if (!loginData.password) {
      errors.password = "Password is required";
      isValid = false;
    }
    
    setLoginErrors(errors);
    return isValid;
  };
  
  // Validate register form
  const validateRegisterForm = () => {
    const errors = {
      username: "",
      email: "",
      password: "",
      confirmPassword: ""
    };
    let isValid = true;
    
    if (!registerData.username) {
      errors.username = "Username is required";
      isValid = false;
    } else if (registerData.username.length < 3) {
      errors.username = "Username must be at least 3 characters";
      isValid = false;
    }
    
    if (!registerData.email) {
      errors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(registerData.email)) {
      errors.email = "Email is invalid";
      isValid = false;
    }
    
    if (!registerData.password) {
      errors.password = "Password is required";
      isValid = false;
    } else if (registerData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
      isValid = false;
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
      isValid = false;
    }
    
    setRegisterErrors(errors);
    return isValid;
  };
  
  // Check password strength
  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  };

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateLoginForm()) return;
    
    setLoading(true);
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }
      
      // Inside the handleLogin function, after successful login:
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("user", JSON.stringify(data.user));
      // Set cookies to share auth state with middleware
      document.cookie = `isAuthenticated=true; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days

      // Dispatch event to notify other components about auth change
      window.dispatchEvent(new Event("authChange"));

      toast({
        title: "Success",
        description: "Welcome to BOC Bank Meeting Management System",
        status: "success",
      });

      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Invalid credentials",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateRegisterForm()) return;
    
    setLoading(true);
    
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }
      
      toast({
        title: "Success",
        description: "Account created successfully. You can now log in.",
        status: "success",
      });
      
      setActiveTab("login");
      setLoginData({ email: registerData.email, password: "" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Registration failed",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/60 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic background effect */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(circle 400px at ${mousePosition.x}px ${mousePosition.y}px, rgba(64, 112, 244, 0.15), transparent)`
        }}
      />
      
      {/* Animated shapes in background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute w-64 h-64 rounded-full bg-primary/5 top-1/4 -left-20"
          animate={{
            y: [0, 30, 0],
            x: [0, 15, 0],
            rotate: [0, 5, 0]
          }}
          transition={{ repeat: Infinity, duration: 15, ease: "easeInOut", type: "tween" }}
        />
        <motion.div 
          className="absolute w-96 h-96 rounded-full bg-blue-500/5 bottom-1/4 -right-20"
          animate={{
            y: [0, -40, 0],
            x: [0, -20, 0],
            rotate: [0, -7, 0]
          }}
          transition={{ repeat: Infinity, duration: 20, ease: "easeInOut", type: "tween" }}
        />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 , type: "tween" }}
        className="w-full max-w-md relative z-10"
      >
        <Alert className="mb-6 border-blue-500/50 bg-blue-500/10 backdrop-blur-sm shadow-lg">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-500 text-lg font-semibold">Welcome</AlertTitle>
          <AlertDescription className="text-sm">
            Access the BOC Bank Meeting Management System securely
          </AlertDescription>
        </Alert>

        <Card className="backdrop-blur-sm bg-card/90 shadow-lg border-primary/10">
          <CardHeader className="space-y-1 text-center pb-4">
            <motion.div 
              className="flex justify-center mb-4"
              whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
              transition={{ type: "tween", stiffness: 400, damping: 10 }}
            >
              <Building2 className="h-16 w-16 text-primary" />
            </motion.div>
            <CardTitle className="text-3xl font-bold tracking-tight">
              {activeTab === "login" ? "Welcome Back" : "Create Account"}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </TabsTrigger>
                <TabsTrigger value="register" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  <span>Register</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium flex items-center justify-between">
                      <span>Email</span>
                      {loginErrors.email && (
                        <span className="text-xs text-destructive flex items-center">
                          <XCircle className="h-3 w-3 mr-1" /> {loginErrors.email}
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10 bg-background border-primary/20 hover:border-primary/50 transition-colors focus-visible:ring-primary/30"
                        value={loginData.email}
                        onChange={(e) => {
                          setLoginData({ ...loginData, email: e.target.value });
                          // Clear error when typing
                          if (loginErrors.email) {
                            setLoginErrors({ ...loginErrors, email: "" });
                          }
                        }}
                        aria-invalid={!!loginErrors.email}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium flex items-center justify-between">
                      <span>Password</span>
                      {loginErrors.password && (
                        <span className="text-xs text-destructive flex items-center">
                          <XCircle className="h-3 w-3 mr-1" /> {loginErrors.password}
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="pl-10 pr-10 bg-background border-primary/20 hover:border-primary/50 transition-colors focus-visible:ring-primary/30"
                        value={loginData.password}
                        onChange={(e) => {
                          setLoginData({ ...loginData, password: e.target.value });
                          // Clear error when typing
                          if (loginErrors.password) {
                            setLoginErrors({ ...loginErrors, password: "" });
                          }
                        }}
                        aria-invalid={!!loginErrors.password}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember" />
                      <label
                        htmlFor="remember"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Remember me
                      </label>
                    </div>
                  
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button
                      type="submit"
                      className="w-full bg-primary font-semibold text-base group"
                      disabled={loading}
                    >
                      {loading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear", type: "tween" }}
                          className="text-xl"
                        >
                          ⟳
                        </motion.div>
                      ) : (
                        <span className="flex items-center">
                          Sign In
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      )}
                    </Button>
                  </motion.div>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="register-username" className="text-sm font-medium flex items-center justify-between">
                      <span>Username</span>
                      {registerErrors.username && (
                        <span className="text-xs text-destructive flex items-center">
                          <XCircle className="h-3 w-3 mr-1" /> {registerErrors.username}
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="Choose a username"
                        className="pl-10 bg-background border-primary/20 hover:border-primary/50 transition-colors focus-visible:ring-primary/30"
                        value={registerData.username}
                        onChange={(e) => {
                          setRegisterData({ ...registerData, username: e.target.value });
                          if (registerErrors.username) {
                            setRegisterErrors({ ...registerErrors, username: "" });
                          }
                        }}
                        aria-invalid={!!registerErrors.username}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-sm font-medium flex items-center justify-between">
                      <span>Email</span>
                      {registerErrors.email && (
                        <span className="text-xs text-destructive flex items-center">
                          <XCircle className="h-3 w-3 mr-1" /> {registerErrors.email}
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10 bg-background border-primary/20 hover:border-primary/50 transition-colors focus-visible:ring-primary/30"
                        value={registerData.email}
                        onChange={(e) => {
                          setRegisterData({ ...registerData, email: e.target.value });
                          if (registerErrors.email) {
                            setRegisterErrors({ ...registerErrors, email: "" });
                          }
                        }}
                        aria-invalid={!!registerErrors.email}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-sm font-medium flex items-center justify-between">
                      <span>Password</span>
                      {registerErrors.password && (
                        <span className="text-xs text-destructive flex items-center">
                          <XCircle className="h-3 w-3 mr-1" /> {registerErrors.password}
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        className="pl-10 pr-10 bg-background border-primary/20 hover:border-primary/50 transition-colors focus-visible:ring-primary/30"
                        value={registerData.password}
                        onChange={(e) => {
                          const value = e.target.value;
                          setRegisterData({ ...registerData, password: value });
                          checkPasswordStrength(value);
                          if (registerErrors.password) {
                            setRegisterErrors({ ...registerErrors, password: "" });
                          }
                        }}
                        aria-invalid={!!registerErrors.password}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    
                    {/* Password strength indicator */}
                    {registerData.password && (
                      <div className="mt-2">
                        <div className="flex space-x-1 mb-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div 
                              key={`strength-level-${level}`} // More unique key with additional prefix
                              className={`h-1.5 flex-1 rounded-full ${
                                passwordStrength >= level 
                                  ? passwordStrength === 1 
                                    ? "bg-red-500" 
                                    : passwordStrength === 2 
                                    ? "bg-orange-500" 
                                    : passwordStrength === 3 
                                    ? "bg-yellow-500" 
                                    : "bg-green-500"
                                  : "bg-gray-200"
                              }`}
                            />
                          ))}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {passwordStrength === 0 && "Very weak"}
                          {passwordStrength === 1 && "Weak"}
                          {passwordStrength === 2 && "Fair"}
                          {passwordStrength === 3 && "Good"}
                          {passwordStrength === 4 && "Strong"}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-sm font-medium flex items-center justify-between">
                      <span>Confirm Password</span>
                      {registerErrors.confirmPassword && (
                        <span className="text-xs text-destructive flex items-center">
                          <XCircle className="h-3 w-3 mr-1" /> {registerErrors.confirmPassword}
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        className="pl-10 bg-background border-primary/20 hover:border-primary/50 transition-colors focus-visible:ring-primary/30"
                        value={registerData.confirmPassword}
                        onChange={(e) => {
                          setRegisterData({ ...registerData, confirmPassword: e.target.value });
                          if (registerErrors.confirmPassword) {
                            setRegisterErrors({ ...registerErrors, confirmPassword: "" });
                          }
                        }}
                        aria-invalid={!!registerErrors.confirmPassword}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox id="terms" required />
                    <Label htmlFor="terms" className="text-sm">
                      I agree to Terms of Service and Privacy Policy
                    </Label>
                  </div>
                  
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button
                      type="submit"
                      className="w-full bg-primary font-semibold text-base group"
                      disabled={loading}
                    >
                      {loading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear", type: "tween" }}
                          className="text-xl"
                        >
                          ⟳
                        </motion.div>
                      ) : (
                        <span className="flex items-center">
                          Create Account
                          <UserPlus className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      )}
                    </Button>
                  </motion.div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          <CardFooter className="flex flex-col text-center text-sm text-muted-foreground pt-0">
            <p>Protected by industry standard encryption</p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
