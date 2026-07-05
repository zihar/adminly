import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

describe("Dialog", () => {
  it("belum menampilkan judul sebelum trigger diklik", () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Judul</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.queryByText("Judul")).not.toBeInTheDocument();
  });

  it("menampilkan judul setelah trigger diklik", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Judul</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText("Open"));
    expect(await screen.findByText("Judul")).toBeInTheDocument();
  });

  it("tertutup saat Esc ditekan", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Judul</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText("Open"));
    expect(await screen.findByText("Judul")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByText("Judul")).not.toBeInTheDocument();
    });
  });

  it("tertutup saat DialogClose diklik", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Judul</DialogTitle>
          <DialogClose>Close</DialogClose>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText("Open"));
    expect(await screen.findByText("Judul")).toBeInTheDocument();
    await user.click(screen.getByText("Close"));
    expect(screen.queryByText("Judul")).not.toBeInTheDocument();
  });
});
