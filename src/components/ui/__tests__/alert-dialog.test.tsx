import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

describe("AlertDialog", () => {
  it("belum menampilkan judul sebelum trigger diklik", () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Judul</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.queryByText("Judul")).not.toBeInTheDocument();
  });

  it("menampilkan judul setelah trigger diklik", async () => {
    const user = userEvent.setup();
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Judul</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.click(screen.getByText("Open"));
    expect(await screen.findByText("Judul")).toBeInTheDocument();
  });

  it("TIDAK tertutup saat backdrop diklik -- beda kunci dari Dialog biasa", async () => {
    const user = userEvent.setup();
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Judul</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.click(screen.getByText("Open"));
    expect(await screen.findByText("Judul")).toBeInTheDocument();

    const backdrop = document.querySelector('[data-slot="alert-dialog-overlay"]');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as Element);

    expect(screen.getByText("Judul")).toBeInTheDocument();
  });

  it("tertutup saat AlertDialogClose diklik", async () => {
    const user = userEvent.setup();
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Judul</AlertDialogTitle>
          <AlertDialogClose>Close</AlertDialogClose>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.click(screen.getByText("Open"));
    expect(await screen.findByText("Judul")).toBeInTheDocument();
    await user.click(screen.getByText("Close"));
    await waitFor(() => {
      expect(screen.queryByText("Judul")).not.toBeInTheDocument();
    });
  });
});
