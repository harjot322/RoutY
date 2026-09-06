import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { storage } from "@/src/utils/storage";

export type FavLabel = "home" | "market" | "other";
export type Favourite = { stop_id: string; route_id: string; name: string; name_hi: string; label: FavLabel };

type Ctx = {
  favourites: Favourite[];
  isFavourite: (stopId: string) => boolean;
  add: (f: Favourite) => void;
  remove: (stopId: string) => void;
};

const FavContext = createContext<Ctx | null>(null);
const KEY = "routy_favourites";

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favourites, setFavourites] = useState<Favourite[]>([]);

  useEffect(() => {
    storage.getItem<string>(KEY, "").then((raw) => {
      if (raw) {
        try {
          setFavourites(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  const persist = (list: Favourite[]) => {
    setFavourites(list);
    storage.setItem(KEY, JSON.stringify(list));
  };
  const add = useCallback((f: Favourite) => persist([...favourites.filter((x) => x.stop_id !== f.stop_id), f].slice(-8)), [favourites]);
  const remove = useCallback((stopId: string) => persist(favourites.filter((x) => x.stop_id !== stopId)), [favourites]);
  const isFavourite = useCallback((stopId: string) => favourites.some((x) => x.stop_id === stopId), [favourites]);

  const value = useMemo(() => ({ favourites, isFavourite, add, remove }), [favourites, isFavourite, add, remove]);
  return <FavContext.Provider value={value}>{children}</FavContext.Provider>;
}

export function useFavourites() {
  const ctx = useContext(FavContext);
  if (!ctx) throw new Error("useFavourites outside FavoritesProvider");
  return ctx;
}

export const FAV_ICONS: Record<FavLabel, string> = { home: "home", market: "storefront", other: "star" };
