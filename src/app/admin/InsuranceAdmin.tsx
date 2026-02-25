"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Search, ArrowUpDown, ChevronUp, ChevronDown, Download, Shield } from "lucide-react";
import { formatDateShort } from "@/lib/dates";
import { Pagination } from "@/app/components/ui/pagination";
import { EmptyState } from "@/app/components/ui/empty-state";

interface InsuranceWithUser {
  id: number;
  user_id: number;
  instrument_name: string;
  brand: string;
  model: string;
  serial_number: string;
  created_at: string;
  updated_at: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

type SortField = "musician" | "instrument" | "brand" | "date";

function getMusicianName(item: InsuranceWithUser): string {
  if (item.first_name && item.last_name) {
    return `${item.first_name} ${item.last_name}`;
  }
  return item.email;
}

export function InsuranceAdminClient() {
  const [items, setItems] = useState<InsuranceWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("musician");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/admin/insurance");
        if (response.ok) setItems(await response.json());
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-40" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4 ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 ml-1" />
    );
  };

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          getMusicianName(item).toLowerCase().includes(term) ||
          item.instrument_name.toLowerCase().includes(term) ||
          item.brand.toLowerCase().includes(term) ||
          item.model.toLowerCase().includes(term) ||
          item.serial_number.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "musician":
          comparison = getMusicianName(a).localeCompare(getMusicianName(b), "fr");
          break;
        case "instrument":
          comparison = a.instrument_name.localeCompare(b.instrument_name, "fr");
          break;
        case "brand":
          comparison = a.brand.localeCompare(b.brand, "fr");
          break;
        case "date":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [items, searchTerm, sortBy, sortOrder]);

  const paginatedItems = useMemo(
    () => filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredItems, currentPage, pageSize]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const exportCSV = () => {
    const headers = ["Musicien", "Email", "Instrument", "Marque", "Modèle", "N° de série", "Date"];
    const rows = filteredItems.map((item) => [
      getMusicianName(item),
      item.email,
      item.instrument_name,
      item.brand,
      item.model,
      item.serial_number,
      formatDateShort(item.created_at),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `assurances-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assurances</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredItems.length} instrument{filteredItems.length !== 1 ? "s" : ""} assuré
            {filteredItems.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={filteredItems.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, instrument, marque, modèle, n° de série..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filteredItems.length === 0 ? (
            <EmptyState
              icon={<Shield className="w-12 h-12" />}
              title={items.length === 0 ? "Aucun instrument assuré" : "Aucun instrument trouvé"}
              description={
                items.length === 0
                  ? "Les musiciens peuvent ajouter leurs instruments depuis leur espace."
                  : "Essayez de modifier vos critères de recherche."
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        onClick={() => handleSort("musician")}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        Musicien
                        <SortIcon field="musician" />
                      </button>
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort("instrument")}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        Instrument
                        <SortIcon field="instrument" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort("brand")}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        Marque
                        <SortIcon field="brand" />
                      </button>
                    </TableHead>
                    <TableHead>Modèle</TableHead>
                    <TableHead>N° de série</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort("date")}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        Date
                        <SortIcon field="date" />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{getMusicianName(item)}</TableCell>
                      <TableCell className="text-muted-foreground">{item.email}</TableCell>
                      <TableCell>{item.instrument_name}</TableCell>
                      <TableCell>{item.brand}</TableCell>
                      <TableCell>{item.model}</TableCell>
                      <TableCell className="font-mono text-sm">{item.serial_number}</TableCell>
                      <TableCell>{formatDateShort(item.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
      {filteredItems.length > 0 && (
        <Pagination
          totalItems={filteredItems.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      )}
    </div>
  );
}
