import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const CustomCheckbox = ({
  value,
  onValueChange,
  label,
  disabled = false,
}) => {
  return (
    <Pressable
      style={[styles.container, disabled && styles.disabled]}
      onPress={() => !disabled && onValueChange(!value)}
      accessibilityRole="checkbox"
      accessibilityState={{
        checked: value,
        disabled,
      }}
    >
      <View style={[styles.box, value && styles.checkedBox]}>
        {value && (
          <MaterialIcons name="check" size={17} color="#FFFFFF" />
        )}
      </View>

      {label ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#2196F3",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkedBox: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  label: {
    marginLeft: 10,
    fontSize: 15,
    color: "#212121",
  },
  disabled: {
    opacity: 0.45,
  },
});

export default CustomCheckbox;