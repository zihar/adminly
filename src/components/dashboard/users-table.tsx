"use client";

import * as React from "react";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Can } from "@/components/auth/can";
import { useI18n } from "@/components/providers/i18n-provider";
import { format } from "@/locales";
import {
  useCreateUser,
  useDeleteUser,
  useUsers,
  type User,
} from "@/hooks/api/use-users";

const statusVariant: Record<
  User["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  invited: "secondary",
  suspended: "destructive",
};

export function UsersTable() {
  const { t } = useI18n();
  const [query, setQuery] = React.useState("");

  const { data, isPending, isError, refetch } = useUsers();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    createUser.mutate(
      { name: name.trim(), email: email.trim(), role: "Viewer" },
      {
        onSuccess: () => {
          setName("");
          setEmail("");
          setAdding(false);
        },
      },
    );
  }

  const filtered = (data ?? []).filter((u) =>
    `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.users.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Can permission="users:manage">
          <Button onClick={() => setAdding((v) => !v)}>
            <Plus className="size-4" />
            {t.users.addUser}
          </Button>
        </Can>
      </div>

      <Can permission="users:manage">
        {adding ? (
          <form
            onSubmit={handleCreate}
            className="flex flex-wrap items-end gap-3 rounded-md border p-4"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="new-name">{t.users.formName}</Label>
              <Input
                id="new-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-email">{t.users.formEmail}</Label>
              <Input
                id="new-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={createUser.isPending}>
              {t.users.create}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAdding(false)}
            >
              {t.users.cancel}
            </Button>
          </form>
        ) : null}
      </Can>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.users.colName}</TableHead>
              <TableHead>{t.users.colRole}</TableHead>
              <TableHead>{t.users.colStatus}</TableHead>
              <TableHead>{t.users.colJoined}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    {t.users.loadError}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetch()}
                    >
                      {t.users.retry}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t.users.empty}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback>
                          {user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="leading-tight">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[user.status]}>
                      {t.users.status[user.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {user.createdAt}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">{t.users.actions}</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            toast.info(
                              format(t.users.editingToast, {
                                name: user.name,
                              }),
                            )
                          }
                        >
                          {t.users.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteUser.mutate(user.id)}
                        >
                          {t.users.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
