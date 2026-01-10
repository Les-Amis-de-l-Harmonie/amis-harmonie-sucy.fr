"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/app/components/ui/alert-dialog";
import { Eye, Trash2 } from "lucide-react";
import type { ContactSubmission } from "@/db/types";

export function ContactAdminClient() {
  const [items, setItems] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<ContactSubmission | null>(null);
  const [deleting, setDeleting] = useState<ContactSubmission | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/admin/contact");
      if (response.ok) setItems(await response.json());
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const response = await fetch(`/api/admin/contact?id=${deleting.id}`, { method: "DELETE" });
      if (response.ok) fetchData();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setDeleteDialogOpen(false);
      setDeleting(null);
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-600 dark:text-gray-400">Chargement...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Messages de contact</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.prenom} {item.nom}</TableCell>
                  <TableCell>
                    <a href={`mailto:${item.email}`} className="text-[#a5b3e2] hover:underline">{item.email}</a>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{item.message}</TableCell>
                  <TableCell>{new Date(item.created_at).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setViewing(item); setViewDialogOpen(true); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setDeleting(item); setDeleteDialogOpen(true); }}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">Aucun message</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message de {viewing?.prenom} {viewing?.nom}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                <a href={`mailto:${viewing.email}`} className="text-primary hover:underline">{viewing.email}</a>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</p>
                <p className="text-gray-900 dark:text-gray-100">{new Date(viewing.created_at).toLocaleString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Message</p>
                <p className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 p-4 rounded-md text-gray-900 dark:text-gray-100">{viewing.message}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le message ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
