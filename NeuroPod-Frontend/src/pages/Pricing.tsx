
import React from "react";
import { Navbar } from "@/components/home/Navbar";
import { Footer } from "@/components/home/Footer";
import { PricingCards } from "@/components/pricing/PricingCards";

const Pricing = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="container mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Precios Transparentes y Flexibles
            </h1>
            <p className="mt-6 text-xl text-muted-foreground">
              Elige el hardware que necesitas para tus contenedores. Solo pagas por los recursos que utilizas.
            </p>
          </div>
          <PricingCards />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
