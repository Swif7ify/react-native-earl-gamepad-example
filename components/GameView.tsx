import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { GamepadButtonName } from "react-native-earl-gamepad";

type PlayerState = {
	x: number;
	y: number;
	rotation: number;
	scale: number;
};

const PLAYER_SIZE = 44;
const TARGET_SIZE = 26;

type Props = {
	boardSize: number;
	player: PlayerState;
	target: { x: number; y: number };
	score: number;
	connected: boolean;
	infoName: string;
	isPressed: (b: GamepadButtonName) => boolean;
};

export default function GameView({
	boardSize,
	player,
	target,
	score,
	connected,
	infoName,
	isPressed,
}: Props) {
	const getPlayerColor = () => {
		if (isPressed("y")) return "#22c55e";
		if (isPressed("b")) return "#ef4444";
		return "#3b82f6";
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
								},
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
				<View style={styles.hintBox}>
					<Text style={styles.hintText}>
						Move with left stick or D-pad. Hold A to glow, RB to
						tilt.
					</Text>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	content: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		gap: 24,
		width: "100%",
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
});
