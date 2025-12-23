import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	Pressable,
	StyleSheet,
	Text,
	View,
	useWindowDimensions,
} from "react-native";
import {
	GamepadDebug,
	useGamepad,
	type GamepadButtonName,
} from "react-native-earl-gamepad";
import { SafeAreaView } from "react-native-safe-area-context";

// --- TYPES ---
type Mode = "game" | "debug";

type PlayerState = {
	x: number;
	y: number;
	rotation: number;
	scale: number;
};

// --- CONSTANTS ---
const PLAYER_SIZE = 44;
const TARGET_SIZE = 26;
const BASE_SPEED = 240; // units per second
const BUTTONS: GamepadButtonName[] = [
	"a",
	"b",
	"x",
	"y",
	"lb",
	"rb",
	"lt",
	"rt",
	"back",
	"start",
	"ls",
	"rs",
	"dpadUp",
	"dpadDown",
	"dpadLeft",
	"dpadRight",
	"home",
];

// --- MAIN COMPONENT ---
export default function Home() {
	const { width } = useWindowDimensions();
	// Limit board size to keep it playable on all screens
	const boardSize = Math.max(260, Math.min(width - 32, 420));

	const [mode, setMode] = useState<Mode>("game");

	// Player State
	const [player, setPlayer] = useState<PlayerState>({
		x: boardSize / 2,
		y: boardSize / 2,
		rotation: 0,
		scale: 1,
	});

	const [target, setTarget] = useState<{ x: number; y: number }>(() =>
		randomPoint(boardSize)
	);
	const [score, setScore] = useState(0);
	const [connected, setConnected] = useState(false);

	// Keep target in a ref to avoid double-hit artifacts between frames.
	const targetRef = useRef(target);

	// Animation refs
	const lastFrame = useRef<number | null>(null);
	const rafId = useRef<number | null>(null);

	// Gamepad Hook
	const { pressedButtons, axes, info, isPressed, bridge, vibrate } =
		useGamepad({
			enabled: true,
			axisThreshold: 0.12,
			onStatus: (event) => setConnected(event.state === "connected"),
		});

	const axesRef = useRef(axes);
	const pressedRef = useRef(pressedButtons);

	// Keep refs synced for the animation loop
	useEffect(() => {
		axesRef.current = axes;
	}, [axes]);

	useEffect(() => {
		pressedRef.current = pressedButtons;
	}, [pressedButtons]);

	useEffect(() => {
		targetRef.current = target;
	}, [target]);

	// --- GAME LOOP ---
	useEffect(() => {
		const step = (timestamp: number) => {
			const last = lastFrame.current ?? timestamp;
			const dt = Math.min((timestamp - last) / 1000, 0.05); // Cap dt to prevent huge jumps
			lastFrame.current = timestamp;

			setPlayer((prev) => {
				const pressed = pressedRef.current;
				const axes = axesRef.current;

				// 1. SPEED: Square (X on gamepad) boosts speed
				const isTurbo = pressed.has("x");
				const currentSpeed = isTurbo ? BASE_SPEED * 2.5 : BASE_SPEED;

				// 2. MOVEMENT: Stick + D-Pad
				const input = getInputVector(axes, pressed);
				const dx = input.x * currentSpeed * dt;
				const dy = input.y * currentSpeed * dt;

				// 3. ROTATION: L1 (LB) and R1 (RB)
				let newRotation = prev.rotation;
				if (pressed.has("lb")) newRotation -= 200 * dt;
				if (pressed.has("rb")) newRotation += 200 * dt;

				// 4. SCALE: L2 (LT) and R2 (RT)
				let newScale = prev.scale;
				if (pressed.has("lt"))
					newScale = Math.max(0.5, newScale - 2 * dt); // Shrink
				if (pressed.has("rt"))
					newScale = Math.min(2.5, newScale + 2 * dt); // Grow

				const next = {
					x: clamp(
						prev.x + dx,
						PLAYER_SIZE / 2,
						boardSize - PLAYER_SIZE / 2
					),
					y: clamp(
						prev.y + dy,
						PLAYER_SIZE / 2,
						boardSize - PLAYER_SIZE / 2
					),
					rotation: newRotation,
					scale: newScale,
				};

				// 5. COLLISION
				const dist = distance(next, targetRef.current);
				const effectivePlayerSize = PLAYER_SIZE * next.scale;

				if (dist <= (effectivePlayerSize + TARGET_SIZE) / 2) {
					const newTarget = spawnTarget(boardSize, next);
					targetRef.current = newTarget; // update ref immediately to avoid re-hitting
					setTarget(newTarget);
					setScore((value) => value + 1);
					if (vibrate) {
						vibrate(60, 0.7);
					}
				}

				return next;
			});

			rafId.current = requestAnimationFrame(step);
		};

		rafId.current = requestAnimationFrame(step);
		return () => {
			if (rafId.current !== null) {
				cancelAnimationFrame(rafId.current);
			}
			lastFrame.current = null;
		};
	}, [boardSize, vibrate]);

	const headerTitle = useMemo(
		() => (mode === "game" ? "Mini Field" : "Gamepad Debug"),
		[mode]
	);

	return (
		<SafeAreaView
			style={styles.safeArea}
			edges={["bottom", "left", "right"]}
		>
			<View style={styles.container}>
				<Stack.Screen
					options={{
						title: headerTitle,
						headerTitleAlign: "center",
						headerStyle: { backgroundColor: "#f8fafc" },
						headerTintColor: "#0f172a",
						headerShadowVisible: false,
						headerRight: () => (
							<ModeSwitch mode={mode} onChange={setMode} />
						),
					}}
				/>
				{bridge}

				{mode === "game" ? (
					<GameBoard
						boardSize={boardSize}
						player={player}
						target={target}
						score={score}
						connected={connected}
						infoName={info?.id || "No controller"}
						isPressed={isPressed}
						pressedButtons={pressedButtons}
						axes={axes} // Pass axes down for visualization
					/>
				) : (
					<View style={styles.debugWrapper}>
						<GamepadDebug axisThreshold={0.12} />
					</View>
				)}
				<StatusBar style="dark" />
			</View>
		</SafeAreaView>
	);
}

// --- SUB-COMPONENTS ---

type ModeSwitchProps = {
	mode: Mode;
	onChange: (mode: Mode) => void;
};

function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
	return (
		<View style={styles.modeSwitch}>
			<ModeButton
				label="Game"
				active={mode === "game"}
				onPress={() => onChange("game")}
			/>
			<ModeButton
				label="Debug"
				active={mode === "debug"}
				onPress={() => onChange("debug")}
			/>
		</View>
	);
}

type ModeButtonProps = {
	label: string;
	active: boolean;
	onPress: () => void;
};

function ModeButton({ label, active, onPress }: ModeButtonProps) {
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.modeButton,
				active && styles.modeButtonActive,
				pressed && styles.modeButtonPressed,
			]}
		>
			<Text
				style={[
					styles.modeButtonText,
					active && styles.modeButtonTextActive,
				]}
			>
				{label}
			</Text>
		</Pressable>
	);
}

type GameBoardProps = {
	boardSize: number;
	player: PlayerState;
	target: { x: number; y: number };
	score: number;
	connected: boolean;
	infoName: string;
	isPressed: (button: GamepadButtonName) => boolean;
	pressedButtons: Set<GamepadButtonName>;
	axes: ReturnType<typeof useGamepad>["axes"];
};

function GameBoard({
	boardSize,
	player,
	target,
	score,
	connected,
	infoName,
	isPressed,
	pressedButtons,
	axes,
}: GameBoardProps) {
	// Visual effects based on buttons
	const getPlayerColor = () => {
		if (isPressed("y")) return "#22c55e"; // Green (Triangle)
		if (isPressed("b")) return "#ef4444"; // Red (Circle)
		return "#3b82f6"; // Default Blue
	};

	const getPlayerBorder = () => {
		if (isPressed("y")) return "#15803d";
		if (isPressed("b")) return "#b91c1c";
		return "#1d4ed8";
	};

	return (
		<View style={styles.content}>
			<View
				style={[styles.board, { width: boardSize, height: boardSize }]}
			>
				<View
					style={[
						styles.target,
						{
							left: target.x - TARGET_SIZE / 2,
							top: target.y - TARGET_SIZE / 2,
						},
					]}
				/>
				<View
					style={[
						styles.player,
						{
							left: player.x - PLAYER_SIZE / 2,
							top: player.y - PLAYER_SIZE / 2,
							backgroundColor: getPlayerColor(),
							borderColor: getPlayerBorder(),
							transform: [
								{ rotate: `${player.rotation}deg` },
								{
									scale:
										player.scale *
										(isPressed("a") ? 1.2 : 1),
								}, // Pulse effect on 'A'
							],
						},
					]}
				/>
			</View>

			<View style={styles.hudContainer}>
				<View style={styles.hudRow}>
					<Text style={styles.hudTitle}>Score</Text>
					<Text style={styles.hudValue}>{score}</Text>
				</View>
				<View style={styles.hudRow}>
					<Text style={styles.hudTitle}>Controller</Text>
					<Text style={styles.hudValue} numberOfLines={1}>
						{connected ? infoName : "Connect a controller"}
					</Text>
				</View>
				<View style={styles.hudRow}>
					<Text style={styles.hudTitle}>Inputs</Text>
					<ButtonLegend pressed={pressedButtons} axes={axes} />
				</View>
				<View style={styles.hintBox}>
					<Text style={styles.hintText}>
						<Text style={{ fontWeight: "bold" }}>L1/R1:</Text>{" "}
						Rotate •{" "}
						<Text style={{ fontWeight: "bold" }}>L2/R2:</Text> Scale
						{"\n"}
						<Text style={{ fontWeight: "bold" }}>□ (X):</Text> Turbo
						• <Text style={{ fontWeight: "bold" }}>X (A):</Text>{" "}
						Glow{"\n"}
						<Text style={{ fontWeight: "bold" }}>△ (Y):</Text> Green
						• <Text style={{ fontWeight: "bold" }}>○ (B):</Text> Red
					</Text>
				</View>
			</View>
		</View>
	);
}

// --- HELPER FUNCTIONS ---

function getInputVector(
	axes: ReturnType<typeof useGamepad>["axes"],
	pressed: Set<GamepadButtonName>
) {
	const leftX = axes.leftX ?? 0;
	const leftY = axes.leftY ?? 0;

	// Combine Stick and D-Pad
	const x = clamp(
		leftX +
			(pressed.has("dpadRight") ? 1 : 0) -
			(pressed.has("dpadLeft") ? 1 : 0),
		-1,
		1
	);
	const y = clamp(
		leftY +
			(pressed.has("dpadDown") ? 1 : 0) -
			(pressed.has("dpadUp") ? 1 : 0),
		-1,
		1
	);

	const magnitude = Math.max(1, Math.hypot(x, y));
	return { x: x / magnitude, y: y / magnitude };
}

// New logic to spawn target away from player
function spawnTarget(boardSize: number, player: PlayerState) {
	let candidate = randomPoint(boardSize);
	// Try 20 times to find a safe spot
	for (let i = 0; i < 20; i++) {
		// If distance to player is > 100 pixels, it's good
		if (distance(candidate, player) > 100) {
			return candidate;
		}
		candidate = randomPoint(boardSize);
	}
	return candidate; // Fallback to random if stuck
}

function randomPoint(boardSize: number) {
	const margin = PLAYER_SIZE;
	return {
		x: randomBetween(margin, boardSize - margin),
		y: randomBetween(margin, boardSize - margin),
	};
}

function randomBetween(min: number, max: number) {
	return Math.random() * (max - min) + min;
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

type ButtonLegendProps = {
	pressed: Set<GamepadButtonName>;
	axes: ReturnType<typeof useGamepad>["axes"];
};

function ButtonLegend({ pressed, axes }: ButtonLegendProps) {
	// Check stick magnitude
	const isLeftStickActive =
		Math.hypot(axes.leftX ?? 0, axes.leftY ?? 0) > 0.1;
	const isRightStickActive =
		Math.hypot(axes.rightX ?? 0, axes.rightY ?? 0) > 0.1;

	return (
		<View style={styles.buttonGrid}>
			{/* Visualizers for Sticks */}
			<StickPill label="L-STICK" active={isLeftStickActive} />
			<StickPill label="R-STICK" active={isRightStickActive} />

			{/* Visualizers for Buttons */}
			{BUTTONS.map((key) => {
				const active = pressed.has(key);
				return (
					<View
						key={key}
						style={[
							styles.buttonPill,
							active && styles.buttonPillActive,
						]}
					>
						<Text
							style={[
								styles.buttonPillText,
								active && styles.buttonPillTextActive,
							]}
						>
							{key.toUpperCase()}
						</Text>
					</View>
				);
			})}
		</View>
	);
}

function StickPill({ label, active }: { label: string; active: boolean }) {
	return (
		<View
			style={[
				styles.buttonPill,
				active && styles.stickPillActive, // Different color for sticks?
			]}
		>
			<Text
				style={[
					styles.buttonPillText,
					active && styles.buttonPillTextActive,
				]}
			>
				{label}
			</Text>
		</View>
	);
}

// --- STYLES ---

const styles = StyleSheet.create({
	safeArea: {
		height: "100%",
		backgroundColor: "#f8fafc",
	},
	container: {
		backgroundColor: "#f8fafc",
		gap: 12,
	},
	content: {
		alignItems: "center",
		justifyContent: "center",
		gap: 24,
		width: "100%",
	},
	debugWrapper: {
		height: "100%",
		width: "100%",
		justifyContent: "center",
		backgroundColor: "#f1f5f9",
		borderRadius: 12,
	},
	board: {
		borderRadius: 18,
		backgroundColor: "#ffffff",
		borderWidth: 1,
		borderColor: "#e2e8f0",
		overflow: "hidden",
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#64748b",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 12,
		elevation: 4,
	},
	player: {
		position: "absolute",
		width: PLAYER_SIZE,
		height: PLAYER_SIZE,
		borderRadius: 12,
		borderWidth: 2,
		shadowColor: "#000",
		shadowOpacity: 0.25,
		shadowRadius: 4,
		shadowOffset: { width: 0, height: 2 },
	},
	target: {
		position: "absolute",
		width: TARGET_SIZE,
		height: TARGET_SIZE,
		borderRadius: TARGET_SIZE / 2,
		backgroundColor: "#f59e0b",
		borderWidth: 2,
		borderColor: "#d97706",
		shadowColor: "#f59e0b",
		shadowOpacity: 0.35,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 2 },
	},
	hudContainer: {
		width: "100%",
		gap: 8,
	},
	hudRow: {
		width: "100%",
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 8,
	},
	hudTitle: {
		color: "#64748b",
		fontSize: 14,
		letterSpacing: 0.2,
		fontWeight: "600",
	},
	hudValue: {
		color: "#0f172a",
		fontSize: 16,
		fontWeight: "700",
		maxWidth: "70%",
		textAlign: "right",
	},
	hintBox: {
		width: "100%",
		marginTop: 8,
		padding: 12,
		borderRadius: 12,
		backgroundColor: "#f1f5f9",
		borderWidth: 1,
		borderColor: "#e2e8f0",
	},
	hintText: {
		color: "#475569",
		fontSize: 13,
		lineHeight: 20,
		textAlign: "center",
	},
	buttonGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 6,
		justifyContent: "flex-end",
		maxWidth: "70%",
	},
	buttonPill: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
		backgroundColor: "#e2e8f0",
		borderWidth: 1,
		borderColor: "#cbd5e1",
	},
	buttonPillActive: {
		backgroundColor: "#dbeafe",
		borderColor: "#3b82f6",
		shadowColor: "#3b82f6",
		shadowOpacity: 0.35,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 2 },
	},
	stickPillActive: {
		backgroundColor: "#dcfce7", // Greenish for sticks
		borderColor: "#22c55e",
	},
	buttonPillText: {
		color: "#475569",
		fontSize: 12,
		fontWeight: "700",
		letterSpacing: 0.3,
	},
	buttonPillTextActive: {
		color: "#1d4ed8",
	},
	modeSwitch: {
		flexDirection: "row",
		gap: 8,
	},
	modeButton: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		backgroundColor: "#ffffff",
		borderWidth: 1,
		borderColor: "#cbd5e1",
	},
	modeButtonActive: {
		backgroundColor: "#eff6ff",
		borderColor: "#3b82f6",
	},
	modeButtonPressed: {
		opacity: 0.85,
	},
	modeButtonText: {
		color: "#64748b",
		fontSize: 13,
		fontWeight: "600",
	},
	modeButtonTextActive: {
		color: "#2563eb",
	},
});
