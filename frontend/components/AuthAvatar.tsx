"use client";

import { useState, useEffect } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut, User } from "firebase/auth";
import { api } from "@/lib/api";
import Image from "next/image";
import "./AuthAvatar.css";

export default function AuthAvatar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string>("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      setLoading(false);
      setAvatarSrc(u?.photoURL || "");
      if (u) {
        // Sync with backend
        try {
          const profile = await api.getProfile(u.uid);
          if (profile.picture) {
            setAvatarSrc(profile.picture);
          }
          await api.updateProfile({
            ...profile,
            name: u.displayName || profile.name || "User",
            email: u.email || profile.email || "",
            picture: u.photoURL || profile.picture || "",
          }, u.uid);
        } catch (err) {
          console.error("Failed to sync profile:", err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".auth-avatar-container")) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [dropdownOpen]);

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
      setDropdownOpen(false);
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
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)} 
            className={`auth-profile-btn ${dropdownOpen ? 'active' : ''}`}
            title="User Profile"
          >
            {avatarSrc ? (
              <Image 
                src={avatarSrc} 
                alt="U" 
                width={40} 
                height={40} 
                className="auth-avatar-img" 
                referrerPolicy="no-referrer"
                unoptimized
              />
            ) : (
              <div className="auth-avatar-fallback">
                {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </button>

          {dropdownOpen && (
            <div className="auth-dropdown glass-card">
              <div className="auth-dropdown-header">
                <p className="auth-user-name">{user.displayName || 'User'}</p>
                <p className="auth-user-email">{user.email}</p>
              </div>
              <div className="auth-dropdown-divider" />
              <button onClick={handleSignOut} className="auth-dropdown-item signout">
                Sign out
              </button>
            </div>
          )}
        </div>
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
