import {
    FlatList,
    Image,
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { customColors, typography } from "../../Config/helper";
import { API } from "../../Config/Endpoint";
import assetImages from "../../Config/Image";
import Icon from "react-native-vector-icons/MaterialIcons";

const RetailerHistory = () => {
    const navigation = useNavigation();
    const [logData, setLogData] = useState([]);
    const [userId, setUserId] = useState(null);
    const [today, setToday] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const companyId = await AsyncStorage.getItem("Company_Id");
                const userId = await AsyncStorage.getItem("UserId");

                setUserId(userId);
                fetchRetailerInfo(companyId);
            } catch (err) {
                console.log(err);
            }
        })();
    }, [userId]);

    const fetchRetailerInfo = async id => {
        try {
            const url = `${API.retailers}${id}`;
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const data = await response.json();

            if (data.success === true) {
                const today = new Date().toISOString().split("T")[0];

                const filteredData = data.data.filter(item => {
                    const createdDate = item.Created_Date.split("T")[0]; // Extract date part
                    const matchesUserId = item.Created_By.toString() === userId;
                    const matchesDate = createdDate === today;

                    // console.log(
                    //     `Filtering: Created_By=${item.Created_By}, userId=${userId}, Created_Date=${createdDate}, Today=${today}`,
                    // );
                    setToday(today);
                    return matchesUserId && matchesDate;
                });
                setLogData(filteredData);
            } else {
                console.log("Failed to fetch logs:", data.message);
            }
        } catch (error) {
            console.log("Error fetching logs:", error);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.itemContainer}>
            <Text style={styles.title}>{item.Retailer_Name}</Text>
            <Text style={styles.subtitle}>
                Address: {item.Reatailer_Address}
            </Text>
            <Text style={styles.subtitle}>Created By: {item.createdBy}</Text>
            <Text style={styles.subtitle}>Created Date: {today}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <ImageBackground
                source={assetImages.backgroundImage}
                style={styles.backgroundImage}>
                <View style={styles.overlay}>
                    <View style={styles.headersContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Icon
                                name="arrow-back"
                                size={25}
                                color={customColors.white}
                            />
                        </TouchableOpacity>
                        <Text
                            style={styles.headersText}
                            maxFontSizeMultiplier={1.2}>
                            Today's Log
                        </Text>
                    </View>

                    {logData.length > 0 ? (
                        <FlatList
                            data={logData}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={renderItem}
                        />
                    ) : (
                        <Text style={styles.emptyText}>
                            No data available for today.
                        </Text>
                    )}
                </View>
            </ImageBackground>
        </View>
    );
};

export default RetailerHistory;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.background,
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.2)",
    },
    headersContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 20,
    },
    headersText: {
        flex: 1,
        ...typography.h4(),
        color: customColors.white,
        marginHorizontal: 10,
    },

    itemContainer: {
        padding: 16,
        marginBottom: 12,
        backgroundColor: customColors.white,
        borderRadius: 8,
        elevation: 2,
        marginHorizontal: 20,
    },
    title: {
        ...typography.h6(),
        color: "#4CAF50",
        fontWeight: "bold",
        marginBottom: 8,
    },
    subtitle: {
        ...typography.body1(),
        color: "#555",
    },
    emptyText: {
        ...typography.body1(),
        color: "#888",
        textAlign: "center",
        marginTop: 20,
    },
});
