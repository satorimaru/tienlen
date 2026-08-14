"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MessageKey } from "@/lib/i18n";
import { BLITZ_MS, DEFAULT_RULES, parseRules, teamOf } from "@/lib/rules";
import type { RoomEvent, RoomView } from "@/lib/rooms/types";
import { beats, detectCombo } from "@/lib/tienlen/combos";
import { isStuckOnLastTwo } from "@/lib/tienlen/engine";
import {
  cardId,
  formatCard,
  isJoker,
  sameCard,
  SUITS,
  WILD_RANKS,
  type Card,
  type Rank,
  type Suit,
} from "@/lib/tienlen/types";
import { useApp } from "./AppProviders";
import { CardView } from "./CardView";
import { Hand } from "./Hand";
import { ResultModal } from "./ResultModal";

interface GameTableProps {
  room: RoomView;
  playerId: string;
  onPlay: (cards: Card[]) => Promise<void>;
  onPass: () => Promise<void>;
  onRematch: () => Promise<void>;
  busy?: boolean;
  error?: string | null;
  rematchLabel?: string;
  rematchHint?: string;
  onTimeout?: () => void;
}

function comboKey(type: string): MessageKey {
  const key = `combo.${type}` as MessageKey;
  return key;
}

export function GameTable({
  room,
  playerId,
  onPlay,
  onPass,
  onRematch,
  busy,
  error,
  rematchLabel,
  rematchHint,
  onTimeout,
}: GameTableProps) {
  const { t, te } = useApp();
  const [selected, setSelected] = useState<string[]>([]);
  const [jokerFace, setJokerFace] = useState<
    Record<string, { rank: Rank; suit: Suit }>
  >({});
  const rules = room.rules ?? parseRules(DEFAULT_RULES);

  const me = room.players.find((p) => p.id === playerId);
  const isMyTurn = room.currentPlayerId === playerId;
  const opponents = room.players.filter((p) => p.id !== playerId);

  const selectedCards: Card[] = useMemo(() => {
    return room.hand
      .filter((c) => selected.includes(cardId(c)))
      .map((c) => {
        if (!isJoker(c)) return c;
        const face = jokerFace[cardId(c)];
        return face ? { ...c, as: face } : c;
      });
  }, [room.hand, selected, jokerFace]);

  const selectedJokers = selectedCards.filter(isJoker);
  const jokersReady = selectedJokers.every((c) => c.as);

  const combo = useMemo(() => detectCombo(selectedCards), [selectedCards]);

  const pileCombo = useMemo(() => {
    if (!room.pile.length || !room.pileType) return null;
    return detectCombo(room.pile);
  }, [room.pile, room.pileType]);

  const mustLeadCard =
    !room.pile.length &&
    room.leadCard &&
    room.hand.some((c) => sameCard(c, room.leadCard!))
      ? room.leadCard
      : null;

  const canPlay = useMemo(() => {
    if (!isMyTurn || !combo || !jokersReady) return false;
    if (combo.type === "skip" || combo.type === "reverse") {
      return rules.powerup;
    }
    if (mustLeadCard && !selectedCards.some((c) => sameCard(c, mustLeadCard))) {
      return false;
    }
    if (
      rules.noFinishOnTwo &&
      selectedCards.length === room.hand.length &&
      selectedCards.some((c) => c.rank === "2")
    ) {
      return false;
    }
    return beats(combo, pileCombo);
  }, [
    isMyTurn,
    combo,
    mustLeadCard,
    selectedCards,
    pileCombo,
    rules.noFinishOnTwo,
    rules.powerup,
    room.hand.length,
    jokersReady,
  ]);

  const [blitzLeft, setBlitzLeft] = useState<number | null>(null);
  const timedOut = useRef(false);
  useEffect(() => {
    timedOut.current = false;
    if (!rules.blitz || room.status !== "playing" || !room.currentPlayerId) {
      setBlitzLeft(null);
      return;
    }
    const started = room.turnStartedAt ?? Date.now();
    const tick = () => {
      const left = Math.max(0, started + BLITZ_MS - Date.now());
      setBlitzLeft(left);
      if (left <= 0 && isMyTurn && !timedOut.current) {
        timedOut.current = true;
        onTimeout?.();
      }
    };
    tick();
    const id = window.setInterval(tick, 80);
    return () => window.clearInterval(id);
  }, [
    rules.blitz,
    room.status,
    room.currentPlayerId,
    room.turnStartedAt,
    room.turnVersion,
    isMyTurn,
    onTimeout,
  ]);

  const canPass =
    isMyTurn &&
    (room.pile.length > 0 || isStuckOnLastTwo(room.hand, rules));

  const banner = (() => {
    const event: RoomEvent | null = room.lastEvent;
    if (!event) return null;
    const name =
      "playerId" in event
        ? (room.players.find((p) => p.id === event.playerId)?.name ??
          t("game.someone"))
        : "";
    switch (event.kind) {
      case "play":
        return `${name} · ${t(comboKey(event.comboType))}`;
      case "pass":
        return `${name} ${t("game.passed")}`;
      case "start":
        return t("game.cardsOut");
      default:
        return null;
    }
  })();

  const toggle = (c: Card) => {
    if (!isMyTurn) return;
    const id = cardId(c);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    if (selected.includes(id)) {
      setJokerFace((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const currentName =
    room.players.find((p) => p.id === room.currentPlayerId)?.name ?? "…";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {opponents.map((p) => (
          <div
            key={p.id}
            className={[
              "min-w-[5.5rem] flex-1 rounded-2xl px-2 py-2 text-center",
              p.id === room.currentPlayerId
                ? "bg-[rgba(212,176,106,0.14)] ring-1 ring-[var(--gold)]"
                : "bg-black/20",
            ].join(" ")}
          >
            <p className="truncate text-xs font-medium text-[var(--ivory)]">
              {p.name}
              {p.finishOrder != null && (
                <span className="ml-1 text-[var(--gold)]">#{p.finishOrder}</span>
              )}
            </p>
            {rules.siege && room.players.length === 4 && (
              <p className="text-[10px] text-[var(--gold-dim)]">
                {teamOf(p.seat) === 0 ? t("game.teamA") : t("game.teamB")}
              </p>
            )}
            <p className="mt-1 text-[11px] text-[var(--mute)]">
              {p.cardCount}
            </p>
          </div>
        ))}
      </div>

      <div className="table-felt my-2 flex min-h-0 flex-1 flex-col items-center justify-center rounded-[1.6rem] px-3 py-4">
        {rules.blitz && blitzLeft != null && room.status === "playing" && (
          <div className="mb-2 w-full max-w-[12rem]">
            <div className="mb-1 text-center text-[11px] text-[var(--gold)]">
              {t("game.timer", { n: Math.ceil(blitzLeft / 1000) })}
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full bg-[var(--gold)]"
                style={{ width: `${(blitzLeft / BLITZ_MS) * 100}%` }}
              />
            </div>
          </div>
        )}
        {banner && (
          <p className="mb-1 text-[11px] tracking-wide text-[var(--gold)]">
            {banner}
          </p>
        )}
        <p className="mb-3 max-w-[16rem] text-center text-sm text-[var(--ivory)]">
          {room.status === "finished"
            ? t("game.handOver")
            : isMyTurn
              ? room.pile.length
                ? t("game.beatOrPass")
                : mustLeadCard
                  ? t("game.lead", { card: formatCard(mustLeadCard) })
                  : t("game.yourLead")
              : currentName}
        </p>
        {room.pile.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-1">
            {room.pile.map((c) => (
              <CardView key={cardId(c)} card={c} size="md" />
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--mute)]">{t("game.openTable")}</p>
        )}
        {room.pileType && (
          <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[var(--gold-dim)]">
            {t(comboKey(room.pileType))}
          </p>
        )}
      </div>

      <div className="rounded-t-[1.6rem] border-t border-[rgba(212,176,106,0.14)] bg-[rgba(8,14,12,0.94)] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-[var(--ivory)]">
            {me?.name ?? t("game.you")}
            <span className="ml-2 text-[var(--mute)]">{room.hand.length}</span>
          </span>
          {selected.length > 0 && (
            <button
              type="button"
              className="min-h-8 px-2 text-xs text-[var(--gold)]"
              onClick={() => {
                setSelected([]);
                setJokerFace({});
              }}
            >
              {t("game.clear")}
            </button>
          )}
        </div>

        <Hand
          cards={room.hand}
          selected={selected}
          onToggle={toggle}
          disabled={!isMyTurn || busy}
        />

        {selectedJokers.length > 0 && (
          <div className="mt-2 space-y-2">
            {selectedJokers.map((joker, i) => {
              const id = cardId(joker);
              const face = jokerFace[id];
              return (
                <div
                  key={id}
                  className="rounded-xl bg-black/25 px-2 py-2"
                >
                  <p className="mb-1.5 text-[11px] text-[var(--gold)]">
                    {t("game.jokerAs")}
                    {selectedJokers.length > 1 ? ` ${i + 1}` : ""}
                    {face ? ` · ${formatCard({ ...joker, as: face })}` : ""}
                  </p>
                  <div className="mb-1.5 flex flex-wrap gap-1">
                    {WILD_RANKS.map((rank) => (
                      <button
                        key={rank}
                        type="button"
                        className={[
                          "min-h-8 min-w-8 rounded-lg text-xs font-semibold",
                          face?.rank === rank
                            ? "bg-[var(--gold)] text-[#1a1408]"
                            : "bg-black/30 text-[var(--ivory)]",
                        ].join(" ")}
                        onClick={() =>
                          setJokerFace((prev) => ({
                            ...prev,
                            [id]: { rank, suit: prev[id]?.suit ?? "S" },
                          }))
                        }
                      >
                        {rank}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    {SUITS.map((suit) => (
                      <button
                        key={suit}
                        type="button"
                        className={[
                          "min-h-8 min-w-8 rounded-lg text-sm",
                          face?.suit === suit
                            ? "bg-[var(--gold)] text-[#1a1408]"
                            : "bg-black/30 text-[var(--ivory)]",
                        ].join(" ")}
                        onClick={() =>
                          setJokerFace((prev) => ({
                            ...prev,
                            [id]: { rank: prev[id]?.rank ?? "3", suit },
                          }))
                        }
                      >
                        {suit === "S"
                          ? "♠"
                          : suit === "C"
                            ? "♣"
                            : suit === "D"
                              ? "♦"
                              : "♥"}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <p className="mb-2 rounded-lg bg-[rgba(196,30,58,0.12)] px-3 py-2 text-center text-sm text-[#f0b4bd]">
            {te(error)}
          </p>
        )}

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={!canPlay || busy}
            onClick={() => {
              void onPlay(selectedCards).then(() => {
                setSelected([]);
                setJokerFace({});
              });
            }}
            className="btn-gold flex-1 touch-manipulation"
          >
            {t("game.play")}
            {combo ? ` · ${t(comboKey(combo.type))}` : ""}
          </button>
          <button
            type="button"
            disabled={!canPass || busy}
            onClick={() => {
              void onPass().then(() => setSelected([]));
            }}
            className="btn-ghost flex-1 touch-manipulation"
          >
            {t("game.pass")}
          </button>
        </div>
      </div>

      {room.status === "finished" && (
        <ResultModal
          room={room}
          playerId={playerId}
          onRematch={onRematch}
          busy={busy}
          rematchLabel={rematchLabel}
          rematchHint={rematchHint}
        />
      )}
    </div>
  );
}
