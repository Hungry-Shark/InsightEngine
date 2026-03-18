"use client";

import { useState, useEffect } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut, User } from "firebase/auth";
import "./AuthAvatar.css";

export default function AuthAvatar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return <div className="animate-pulse w-10 h-10 rounded-full bg-white/10 block"></div>;
  }

  return (
    <div className="auth-avatar-container">
      {user ? (
        <>
          <span className="auth-pro-badge">PRO</span>
          <button 
            onClick={handleSignOut} 
            title="Click to Sign Out" 
            className="auth-profile-btn"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="User Avatar" className="auth-avatar-img" />
            ) : (
              <div className="auth-avatar-fallback">
                {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </button>
        </>
      ) : (
        <button
          onClick={handleSignIn}
          className="auth-btn-signin"
        >
          Sign in
        </button>
      )}
    </div>
  );
}
