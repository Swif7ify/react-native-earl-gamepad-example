import React from "react";
import { StyleSheet, View } from "react-native";
import { GamepadDebug } from "react-native-earl-gamepad";

type Props = {
	axisThreshold?: number;
};

export default function DebugView({ axisThreshold = 0.12 }: Props) {
	return (
		<View style={styles.wrapper}>
			<GamepadDebug axisThreshold={axisThreshold} />
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		width: "100%",
		justifyContent: "center",
		backgroundColor: "#f1f5f9",
		borderRadius: 12,
		overflow: "hidden",
	},
});
