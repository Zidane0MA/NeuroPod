
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FilterX } from "lucide-react";

interface UsersSearchProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterActivePods: boolean;
  setFilterActivePods: (active: boolean) => void;
  filterOnline: boolean;
  setFilterOnline: (online: boolean) => void;
  handleSearch: () => void;
  clearFilters: () => void;
}

export const UsersSearch = ({
  searchTerm,
  setSearchTerm,
  filterActivePods,
  setFilterActivePods,
  filterOnline,
  setFilterOnline,
  handleSearch,
  clearFilters
}: UsersSearchProps) => {
  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre o email"
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={filterActivePods ? "default" : "outline"} onClick={() => {
            setFilterActivePods(!filterActivePods);
            handleSearch();
          }}>
            Pods Activos
          </Button>
          <Button variant={filterOnline ? "default" : "outline"} onClick={() => {
            setFilterOnline(!filterOnline);
            handleSearch();
          }}>
            Conectados
          </Button>
          <Button variant="ghost" onClick={clearFilters}>
            <FilterX className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
          <Button onClick={handleSearch}>
            Buscar
          </Button>
        </div>
      </div>
    </div>
  );
};
