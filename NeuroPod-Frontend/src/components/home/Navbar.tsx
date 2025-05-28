
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Container } from "lucide-react";

export const Navbar = () => {
  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Container className="h-6 w-6 text-purple-500" />
          <Link to="/" className="text-xl font-bold">
            NeuroPod
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium hover:text-primary">
            Home
          </Link>
          <Link to="/features" className="text-sm font-medium hover:text-primary">
            Features
          </Link>
          <Link to="/pricing" className="text-sm font-medium hover:text-primary">
            Pricing
          </Link>
          <a href="https://github.com/Zidane0MA/NeuroPod" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary">
            Documentation
          </a>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Login</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/signup">Sign Up</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};
