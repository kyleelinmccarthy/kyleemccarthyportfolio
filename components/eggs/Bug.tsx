"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  Matrix4,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
  type Group,
  type Mesh,
} from "three";
import { BUG } from "@/content/eggs";
import type { District, Place } from "@/content/types";
import { bugAt, bugOn } from "@/lib/eggs/hooks";
import { MODEL_SCALE } from "@/lib/world/camera";
import { MAX_TICK, isClick } from "@/lib/world/rig";
import {
  bugGround,
  bugPace,
  bugScale,
  bugSeed,
  pointAlong,
  spawnPoint,
  wander,
  type Leg,
} from "@/lib/world/bug";
import { testHooksOn } from "@/lib/world/quality";
import { heightAt } from "@/lib/world/terrain";
import { eggs, useEggs } from "./eggStore";
import { Bumblebee } from "./Bumblebee";

/** The test hooks are live only in an e2e build (`testHooksOn`). */
const TEST_HOOKS = testHooksOn(process.env.NEXT_PUBLIC_E2E);
/** How quickly the bug turns to face the way it walks: the share of the way it turns in a second, near enough. */
const TURN_RATE = 9;
/** How far ahead and behind along its path it looks to see which way it is going, in steps. */
const LOOK = 2;
/** The middle of its body, landed, in its own model units: where its hit shape is and where a test presses it (both rise with it in flight). */
const MIDDLE = new Vector3(0, 0.1, 0);

interface BugProps {
  districts: District[];
  places: Place[];
  /** Reduced motion: the bug stands still where it appears. */
  reducedMotion: boolean;
}

/**
 * The bug easter egg, by day: a bumblebee (`Bumblebee`) bumbling over the
 * planet's land on its own (`lib/world/bug.ts`), flying low and landing by
 * turns, its wings beating as it goes. It is drawn a little larger far out, so it can be
 * seen from over the planet. Pressing it (not dragging across it) catches it:
 * it is gone, the page pops it into confetti with its words (`eggs.squash`,
 * `EggsOnPage`), and another appears somewhere else after `BUG.respawn`
 * seconds. Its invisible hit shape takes the press and shows a pointer; the
 * nearest thing under the pointer takes a press, so a landmark in front of it
 * keeps its own. It moves on the canvas's clock, so it stops while the tab is
 * hidden (`PauseWhenHidden`), and sits still, landed, under reduced motion. A pointer
 * extra: it is decorative, and the page's content is all reached without it.
 */
export function Bug({ districts, places, reducedMotion }: BugProps) {
  const canvas = useThree((state) => state.gl.domElement);
  const { squashed, ready } = useEggs();
  useEffect(() => eggs.load(), []);
  // In an e2e build it is out only when a test asks for it, read once.
  const [hook] = useState(() =>
    typeof window === "undefined" ? undefined : window.__eggBug,
  );
  const on = bugOn(process.env.NEXT_PUBLIC_E2E, hook);
  const ground = useMemo(
    () => bugGround(districts, places),
    [districts, places],
  );
  const [away, setAway] = useState(false);
  // Where the last one was caught, so the next is somewhere else.
  const lastCaught = useRef<Vector3 | undefined>(undefined);
  const seed = bugSeed(squashed);
  const start = useMemo(
    () =>
      ready
        ? spawnPoint(seed, ground, {
            avoid: lastCaught.current,
            near: bugAt(process.env.NEXT_PUBLIC_E2E, hook),
          })
        : null,
    [ready, seed, ground, hook],
  );

  // Another bug, a while after one is caught.
  useEffect(() => {
    if (!away) return;
    const id = window.setTimeout(() => setAway(false), BUG.respawn * 1000);
    return () => window.clearTimeout(id);
  }, [away]);
  useEffect(() => () => void (canvas.style.cursor = ""), [canvas]);

  if (!on || !start || away) return null;
  return (
    <Walker
      key={seed}
      seed={seed}
      ground={ground}
      start={start}
      reducedMotion={reducedMotion}
      onCatch={(at, point) => {
        lastCaught.current = at;
        canvas.style.cursor = "";
        setAway(true);
        eggs.squash(point);
      }}
    />
  );
}

interface WalkerProps {
  seed: number;
  ground: ReturnType<typeof bugGround>;
  start: Vector3;
  reducedMotion: boolean;
  onCatch(at: Vector3, point: { x: number; y: number }): void;
}

/** One bug, walking from `start`: its path a leg at a time, the same for the same seed. */
function Walker({ seed, ground, start, reducedMotion, onCatch }: WalkerProps) {
  const canvas = useThree((state) => state.gl.domElement);
  const body = useRef<Group>(null);
  const flier = useRef<Group>(null);
  const hitShape = useRef<Mesh>(null);
  const wingR = useRef<Group>(null);
  const wingL = useRef<Group>(null);
  const hit = useMemo(
    () => ({
      geometry: new SphereGeometry(1, 10, 8),
      material: new MeshBasicMaterial({ visible: false }),
    }),
    [],
  );
  useEffect(
    () => () => {
      hit.geometry.dispose();
      hit.material.dispose();
    },
    [hit],
  );
  // The first leg, laid out once (a new seed is a new bug, and a new walker).
  const [first] = useState(() =>
    wander(seed, ground, start, new Vector3(0, 1, 0)),
  );
  // The flight so far: the leg it is on and its number, how far along it (in steps), the time it has been out,
  // how far off the ground it is (0 landed, 1 flying), where its wings are in their beat, and which way it faces.
  const walk = useRef<{
    leg: Leg;
    n: number;
    along: number;
    time: number;
    up: number;
    beat: number;
    facing: Vector3 | null;
  }>({
    leg: first,
    n: 0,
    along: 0,
    time: 0,
    up: 0,
    beat: 0,
    facing: null,
  });
  const scratch = useMemo(
    () => ({
      at: new Vector3(),
      ahead: new Vector3(),
      behind: new Vector3(),
      up: new Vector3(),
      side: new Vector3(),
      face: new Vector3(),
      basis: new Matrix4(),
      screen: new Vector3(),
    }),
    [],
  );

  useFrame(({ camera, size }, delta) => {
    const g = body.current;
    if (!g) return;
    const w = walk.current;
    const dt = reducedMotion ? 0 : Math.min(delta, MAX_TICK);
    const pace = reducedMotion ? 0 : bugPace(w.time);
    w.time += dt;
    w.along += (BUG.speed * pace * dt) / BUG.step;
    // Off the end of this leg: the next starts where it ended, facing the way it faced.
    const last = w.leg.points.length - 1;
    if (w.along >= last) {
      w.along -= last;
      w.n++;
      w.leg = wander(seed + w.n, ground, w.leg.points[last], w.leg.heading);
    }
    const s = scratch;
    const { points } = w.leg;
    pointAlong(points, w.along, s.at);
    pointAlong(points, w.along + LOOK, s.ahead);
    pointAlong(points, w.along - LOOK, s.behind);
    s.up.copy(s.at);
    // Which way it is going, flat on the ground; where it stands still, the way it last faced.
    s.face
      .subVectors(s.ahead, s.behind)
      .addScaledVector(s.up, -s.ahead.clone().sub(s.behind).dot(s.up));
    if (s.face.lengthSq() < 1e-12) s.face.copy(w.facing ?? w.leg.heading);
    s.face.normalize();
    if (!w.facing) w.facing = s.face.clone();
    else
      w.facing
        .lerp(s.face, Math.min(1, TURN_RATE * dt))
        .addScaledVector(s.up, -w.facing.dot(s.up))
        .normalize();
    s.side.crossVectors(s.up, w.facing).normalize();
    // Its own +X, +Y and +Z (its front): right-handed, as the side is up × front.
    s.basis.makeBasis(s.side, s.up, w.facing);
    g.quaternion.setFromRotationMatrix(s.basis);
    g.position.copy(s.at).multiplyScalar(1 + heightAt(s.at, ground.districts));
    g.scale.setScalar(MODEL_SCALE * bugScale(camera.position.length()));

    // Its flight: it rises off the ground as it sets off and settles as it stops, bobbing as it goes, its wings
    // beating while it is up and folded flat on its back once it has landed. Its hit shape rises with it.
    w.up += ((pace > 0 ? 1 : 0) - w.up) * Math.min(1, BUG.lift * dt);
    w.beat += dt * BUG.beats * Math.PI * 2 * w.up;
    const lift =
      w.up * (BUG.hover + Math.sin(w.time * BUG.bobs * Math.PI * 2) * BUG.bob);
    if (flier.current) flier.current.position.y = lift;
    if (hitShape.current) hitShape.current.position.y = MIDDLE.y + lift;
    const flap = w.up * (BUG.open + Math.sin(w.beat) * BUG.beat);
    if (wingR.current) wingR.current.rotation.z = flap;
    if (wingL.current) wingL.current.rotation.z = -flap;

    if (TEST_HOOKS) {
      g.updateMatrixWorld();
      const middle = s.screen
        .set(0, MIDDLE.y + lift, 0)
        .applyMatrix4(g.matrixWorld);
      const front = middle.clone().sub(camera.position).dot(s.up) < 0;
      middle.project(camera);
      window.__eggBugScreen = {
        x: ((middle.x + 1) / 2) * size.width,
        y: ((1 - middle.y) / 2) * size.height,
        front,
      };
    }
  });
  useEffect(
    () => () => {
      if (TEST_HOOKS) window.__eggBugScreen = undefined;
    },
    [],
  );

  return (
    <group ref={body} name="bug">
      <Bumblebee body={flier} wings={[wingR, wingL]} />
      <mesh
        ref={hitShape}
        name="bug-hit"
        geometry={hit.geometry}
        material={hit.material}
        position={MIDDLE.toArray()}
        scale={BUG.hit}
        dispose={null}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          canvas.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          canvas.style.cursor = "";
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (!isClick(e.delta)) return;
          onCatch(body.current?.position.clone().normalize() ?? start.clone(), {
            x: e.nativeEvent.clientX,
            y: e.nativeEvent.clientY,
          });
        }}
      />
    </group>
  );
}
