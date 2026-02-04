"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/app/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Shield, Music, Camera, Loader2 } from "lucide-react";
import type { UserRole } from "@/db/types";

interface UserWithProfile {
  id?: number;
  email: string;
  role: UserRole;
  created_at?: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  harmonie_start_date?: string | null;
  is_conservatory_student?: number | null;
  music_theory_level?: string | null;
  emergency_contact_last_name?: string | null;
  emergency_contact_first_name?: string | null;
  emergency_contact_email?: string | null;
  emergency_contact_phone?: string | null;
  instruments?: { instrument_name: string; start_date?: string; level?: string }[];
}

export function UsersAdminClient() {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<UserWithProfile> | null>(null);
  const [deleting, setDeleting] = useState<UserWithProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) setUsers(await response.json() as UserWithProfile[]);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;

    if (!file.type.startsWith("image/")) {
      setError("Veuillez sélectionner une image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    setUploadingAvatar(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json() as { url?: string; error?: string };

      if (response.ok && data.url) {
        setEditing({ ...editing, avatar: data.url });
      } else {
        setError(data.error || "Erreur lors du téléchargement");
      }
    } catch (err) {
      console.error("Error uploading avatar:", err);
      setError("Erreur lors du téléchargement");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const isNew = !editing.id;
      const response = await fetch(isNew ? "/api/admin/users" : `/api/admin/users?id=${editing.id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await response.json() as { error?: string };
      if (response.ok) {
        fetchData();
        setDialogOpen(false);
        setEditing(null);
      } else {
        setError(data.error || "Une erreur est survenue");
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const response = await fetch(`/api/admin/users?id=${deleting.id}`, { method: "DELETE" });
      if (response.ok) fetchData();
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setDeleteDialogOpen(false);
      setDeleting(null);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    if (role === 'ADMIN') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
          <Shield className="w-3 h-3" />
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
        <Music className="w-3 h-3" />
        Musicien
      </span>
    );
  };

  const getDisplayName = (user: UserWithProfile) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return null;
  };

  const addInstrument = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      instruments: [...(editing.instruments || []), { instrument_name: "", start_date: "", level: "" }]
    });
  };

  const removeInstrument = (index: number) => {
    if (!editing) return;
    const newInstruments = [...(editing.instruments || [])];
    newInstruments.splice(index, 1);
    if (newInstruments.length === 0) {
      newInstruments.push({ instrument_name: "", start_date: "", level: "" });
    }
    setEditing({ ...editing, instruments: newInstruments });
  };

  const updateInstrument = (index: number, field: string, value: string) => {
    if (!editing) return;
    const newInstruments = [...(editing.instruments || [])];
    newInstruments[index] = { ...newInstruments[index], [field]: value };
    setEditing({ ...editing, instruments: newInstruments });
  };

  const openEditDialog = (user: Partial<UserWithProfile>) => {
    const userToEdit = { ...user };
    if (!userToEdit.instruments || userToEdit.instruments.length === 0) {
      userToEdit.instruments = [{ instrument_name: "", start_date: "", level: "" }];
    }
    setEditing(userToEdit);
    setError(null);
    setDialogOpen(true);
  };

  if (loading) return <div className="text-center py-8 text-gray-600 dark:text-gray-400">Chargement...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Utilisateurs</h1>
        <Button onClick={() => openEditDialog({ email: "", role: "MUSICIAN" })}>
          <Plus className="w-4 h-4 mr-2" />Nouvel utilisateur
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <Music className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {getDisplayName(user) || <span className="text-gray-400 italic">Non renseigné</span>}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell className="text-gray-500 dark:text-gray-400">
                    {user.city || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setDeleting(user); setDeleteDialogOpen(true); }}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">Aucun utilisateur</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifier" : "Nouvel"} utilisateur</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-6 py-4">
              {error && (
                <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-6">
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                    className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    {editing.avatar ? (
                      <img src={editing.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      </div>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <p className="font-medium text-gray-700 dark:text-gray-300">Photo de profil</p>
                  <p>Cliquez pour changer</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Email *</Label>
                  <Input 
                    type="email"
                    value={editing.email || ""} 
                    onChange={(e) => setEditing({ ...editing, email: e.target.value })} 
                    placeholder="email@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Rôle *</Label>
                  <select 
                    value={editing.role || "MUSICIAN"} 
                    onChange={(e) => setEditing({ ...editing, role: e.target.value as UserRole })}
                    className="flex h-10 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="MUSICIAN">Musicien</option>
                    <option value="ADMIN">Administrateur</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Informations personnelles</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Prénom</Label>
                    <Input 
                      value={editing.first_name || ""} 
                      onChange={(e) => setEditing({ ...editing, first_name: e.target.value })} 
                      placeholder="Jean"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Nom</Label>
                    <Input 
                      value={editing.last_name || ""} 
                      onChange={(e) => setEditing({ ...editing, last_name: e.target.value })} 
                      placeholder="Dupont"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="grid gap-2">
                    <Label>Date de naissance</Label>
                    <Input 
                      type="date"
                      value={editing.date_of_birth || ""} 
                      onChange={(e) => setEditing({ ...editing, date_of_birth: e.target.value })} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Téléphone</Label>
                    <Input 
                      type="tel"
                      value={editing.phone || ""} 
                      onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                      placeholder="06 12 34 56 78"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Adresse postale</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Adresse</Label>
                    <Input 
                      value={editing.address_line1 || ""} 
                      onChange={(e) => setEditing({ ...editing, address_line1: e.target.value })} 
                      placeholder="123 rue de la Musique"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Complément d'adresse</Label>
                    <Input 
                      value={editing.address_line2 || ""} 
                      onChange={(e) => setEditing({ ...editing, address_line2: e.target.value })} 
                      placeholder="Appartement 4B, Bâtiment C"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Code postal</Label>
                      <Input 
                        value={editing.postal_code || ""} 
                        onChange={(e) => setEditing({ ...editing, postal_code: e.target.value })} 
                        placeholder="94370"
                        maxLength={5}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Ville</Label>
                      <Input 
                        value={editing.city || ""} 
                        onChange={(e) => setEditing({ ...editing, city: e.target.value })} 
                        placeholder="Sucy-en-Brie"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Harmonie</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Date d'entrée à l'Harmonie</Label>
                    <Input 
                      type="date"
                      value={editing.harmonie_start_date || ""} 
                      onChange={(e) => setEditing({ ...editing, harmonie_start_date: e.target.value })} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Élève au Conservatoire</Label>
                    <div className="flex items-center gap-4 h-10">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="conservatory"
                          checked={editing.is_conservatory_student === 1}
                          onChange={() => setEditing({ ...editing, is_conservatory_student: 1 })}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm">Oui</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="conservatory"
                          checked={editing.is_conservatory_student !== 1}
                          onChange={() => setEditing({ ...editing, is_conservatory_student: 0 })}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm">Non</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Pratique instrumentale et formation musicale</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Formation Musicale (solfège) - Niveau conservatoire</Label>
                    <Input 
                      value={editing.music_theory_level || ""} 
                      onChange={(e) => setEditing({ ...editing, music_theory_level: e.target.value })} 
                      placeholder="Ex: Cycle 2, 3ème année"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Instruments</Label>
                    {(editing.instruments || []).map((instrument, index) => (
                      <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Instrument {index + 1}</span>
                          {(editing.instruments?.length || 0) > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => removeInstrument(index)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="grid gap-2">
                            <Label>Instrument</Label>
                            <Input
                              value={instrument.instrument_name || ""}
                              onChange={(e) => updateInstrument(index, "instrument_name", e.target.value)}
                              placeholder="Ex: Clarinette"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Date de début</Label>
                            <Input
                              type="date"
                              value={instrument.start_date || ""}
                              onChange={(e) => updateInstrument(index, "start_date", e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Niveau conservatoire</Label>
                            <Input
                              value={instrument.level || ""}
                              onChange={(e) => updateInstrument(index, "level", e.target.value)}
                              placeholder="Ex: Cycle 3"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" onClick={addInstrument} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter un instrument
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Contact d'urgence / Représentant légal</h3>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Prénom</Label>
                      <Input 
                        value={editing.emergency_contact_first_name || ""} 
                        onChange={(e) => setEditing({ ...editing, emergency_contact_first_name: e.target.value })} 
                        placeholder="Marie"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Nom</Label>
                      <Input 
                        value={editing.emergency_contact_last_name || ""} 
                        onChange={(e) => setEditing({ ...editing, emergency_contact_last_name: e.target.value })} 
                        placeholder="Dupont"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Email</Label>
                      <Input 
                        type="email"
                        value={editing.emergency_contact_email || ""} 
                        onChange={(e) => setEditing({ ...editing, emergency_contact_email: e.target.value })} 
                        placeholder="marie.dupont@email.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Téléphone</Label>
                      <Input 
                        type="tel"
                        value={editing.emergency_contact_phone || ""} 
                        onChange={(e) => setEditing({ ...editing, emergency_contact_phone: e.target.value })} 
                        placeholder="06 12 34 56 78"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !editing?.email}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'utilisateur "{deleting?.email}" et toutes ses données seront définitivement supprimés.
            </AlertDialogDescription>
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
