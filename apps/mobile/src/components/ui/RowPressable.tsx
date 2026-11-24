import { useState, type ComponentProps, type ReactNode } from "react";
import { Platform, Pressable, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";

import { cn } from "../../lib/cn";
import { useHoverGesture } from "../../lib/useHoverGesture";

export function RowPressable({
  children,
  className,
  interactionClassName = "bg-row-hover",
  interactionOpacity = 1,
  ...props
}: Omit<ComponentProps<typeof Pressable>, "children"> & {
  readonly children: ReactNode;
  readonly interactionClassName?: string;
  readonly interactionOpacity?: number;
}) {
  if (Platform.OS === "android") {
    return (
      <AndroidRowPressable
        {...props}
        className={className}
        interactionClassName={interactionClassName}
        interactionOpacity={interactionOpacity}
      >
        {children}
      </AndroidRowPressable>
    );
  }
  return (
    <GestureRowPressable
      {...props}
      className={className}
      interactionClassName={interactionClassName}
      interactionOpacity={interactionOpacity}
    >
      {children}
    </GestureRowPressable>
  );
}

function AndroidRowPressable({
  children,
  className,
  interactionClassName,
  interactionOpacity,
  onPointerEnter,
  onPointerLeave,
  ...props
}: Omit<ComponentProps<typeof Pressable>, "children"> & {
  readonly children: ReactNode;
  readonly interactionClassName: string;
  readonly interactionOpacity: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      {...props}
      className={cn("relative overflow-hidden", className)}
      onPointerEnter={(event) => {
        if (
          !props.disabled &&
          (event.nativeEvent.pointerType === "mouse" || event.nativeEvent.pointerType === "pen")
        ) {
          setHovered(true);
        }
        onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        if (hovered) setHovered(false);
        onPointerLeave?.(event);
      }}
    >
      {hovered && !props.disabled ? (
        <View
          pointerEvents="none"
          className={cn("absolute inset-0", interactionClassName)}
          style={{ opacity: interactionOpacity }}
        />
      ) : null}
      {children}
    </Pressable>
  );
}

function GestureRowPressable({
  children,
  className,
  interactionClassName,
  interactionOpacity,
  ...props
}: Omit<ComponentProps<typeof Pressable>, "children"> & {
  readonly children: ReactNode;
  readonly interactionClassName: string;
  readonly interactionOpacity: number;
}) {
  const { hovered, hoverGesture } = useHoverGesture(props.disabled ?? false);
  return (
    <GestureDetector gesture={hoverGesture}>
      <Pressable {...props} className={cn("relative overflow-hidden", className)}>
        {hovered && !props.disabled ? (
          <View
            pointerEvents="none"
            className={cn("absolute inset-0", interactionClassName)}
            style={{ opacity: interactionOpacity }}
          />
        ) : null}
        {children}
      </Pressable>
    </GestureDetector>
  );
}
