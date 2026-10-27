"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import "@/components/react-bits/FolderFloat/FolderFloat.css";

/** Example profiles. Each folder holds the kinds of things Smart Work Core watches for a company. */
const PROFILES = [
  { name: "Empaques del Caribe", items: ["Cartón corrugado", "Alza de la pulpa", "Exportar flores", "Competidores", "Contratos SECOP II"] },
  { name: "Agroindustria del Valle", items: ["Azúcar y etanol", "Sequía por El Niño", "Acuerdo con la UE", "Ingenios vecinos", "Licitaciones del PAE"] },
  { name: "Transporte Andino", items: ["Diésel y peajes", "Paro camionero", "Nuevas concesiones", "Rivales en carga", "Contratos del INVÍAS"] },
];

const sublabel = (count: number) => `${count} temas vigilados`;

/** The folder before its chunk loads: same classes and footprint as the real one, so nothing shifts. */
function ClosedFolder({ name, count }: { name: string; count: number }) {
  return (
    <div className="folder-float" style={{ "--ff-w": "200px", "--ff-h": "148px" } as CSSProperties}>
      <div className="folder-float__folder">
        <span className="folder-float__back" aria-hidden="true" />
        <span className="folder-float__front" aria-hidden="true">
          <span className="folder-float__label">{name}</span>
          <span className="folder-float__sub">{sublabel(count)}</span>
        </span>
      </div>
    </div>
  );
}

const FolderFloat = dynamic(() => import("@/components/react-bits/FolderFloat/FolderFloat"), { ssr: false });

/**
 * One folder per example company, laid out in a row. The physics chunk (matter-js) only loads when
 * the row is near the viewport, and the physics loop only runs while it is on screen. The first
 * folder starts open so the metaphor reads without any interaction; the rest open on click or with
 * the keyboard. Content is also listed for screen readers, whatever the folders are doing.
 */
export function CompanyFolders() {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const preload = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setNear(true);
        preload.disconnect();
      },
      { rootMargin: "300px 0px" },
    );
    const live = new IntersectionObserver(([entry]) => setOnScreen(Boolean(entry?.isIntersecting)));
    preload.observe(node);
    live.observe(node);
    return () => {
      preload.disconnect();
      live.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className="swc-folders">
      <ul className="m-0 grid list-none justify-items-center gap-x-6 gap-y-10 p-0 pt-44 md:grid-cols-3">
        {PROFILES.map((profile, index) => (
          <li key={profile.name} className={index === 0 ? "" : "hidden md:block"}>
            <p className="sr-only">
              {profile.name} vigila: {profile.items.join(", ")}.
            </p>
            {near ? (
              <FolderFloat
                label={profile.name}
                sublabel={sublabel(profile.items.length)}
                items={profile.items}
                trigger="click"
                defaultOpen={index === 0}
                closeOnSelect={false}
                physics={onScreen}
                drift={0.35}
                spread={150}
                folderColor="var(--swc-folder-back)"
                frontColor="var(--swc-folder-front)"
                paperColor="var(--swc-folder-paper)"
                itemColor="var(--swc-lime)"
                itemTextColor="var(--swc-ink)"
                labelColor="#ffffff"
              />
            ) : (
              <ClosedFolder name={profile.name} count={profile.items.length} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
