import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Rocket,
  Users,
  Calendar,
  Package,
  LogOut,
  Menu,
  X,
  CreditCard,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";

export const Navbar = () => {
  const location = useLocation();
  const { logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: "/", icon: Rocket, label: "الرئيسية" },
    { path: "/clients", icon: UserPlus, label: "إدارة العملاء" },
    { path: "/clients-list", icon: Users, label: "قائمة العملاء" },
    { path: "/subscriptions", icon: CreditCard, label: "الاشتراكات" },
    { path: "/reservations", icon: Calendar, label: "الحجوزات" },
    { path: "/products", icon: Package, label: "المنتجات" },
  ];

  return (
    <nav className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <Rocket className="h-8 w-8 text-primary-500 group-hover:scale-110 transition-transform" />
              <span className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary-500 transition-colors">
                X Space
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-4 rtl:space-x-reverse">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 ${
                  isActive(item.path)
                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <item.icon className="h-5 w-5 ml-2" />
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <NotificationBell />

            {/* Logout Button */}
            <button
              onClick={logout}
              className="flex items-center px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all hover:scale-105 shadow-lg shadow-red-500/20"
            >
              <LogOut className="h-5 w-5 ml-2" />
              <span className="hidden sm:block">تسجيل الخروج</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-200 dark:border-slate-700/50">
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive(item.path)
                      ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <item.icon className="h-5 w-5 ml-3" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
