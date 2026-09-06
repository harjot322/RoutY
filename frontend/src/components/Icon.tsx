import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import React from "react";
import { ColorValue } from "react-native";

type Props = { name: string; size?: number; color: ColorValue; style?: any };

export function Icon({ name, size = 24, color, style }: Props) {
  return <MaterialDesignIcons name={name as any} size={size} color={color as string} style={style} />;
}
