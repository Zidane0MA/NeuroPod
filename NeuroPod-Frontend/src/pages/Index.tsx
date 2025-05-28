
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Features } from "@/components/home/Features";
import { Hero } from "@/components/home/Hero";
import { Navbar } from "@/components/home/Navbar";
import { Footer } from "@/components/home/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
