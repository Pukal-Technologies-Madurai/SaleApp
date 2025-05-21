import {
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import React, { useState, useEffect } from "react";

import { customColors, typography } from "../Config/helper";
import { API } from "../Config/Endpoint";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import { Dropdown } from "react-native-element-dropdown";
import assetImages from "../Config/Image";
import AppHeader from "../Components/AppHeader";
import EnhancedDropdown from "../Components/EnhancedDropdown";

const RetailerMapView = () => {
    const navigation = useNavigation();

    const [data, setData] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);
    const [retailers, setRetailers] = useState([]);
    const [htmlContent, setHtmlContent] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const companyId = await AsyncStorage.getItem("Company_Id");
                fetchAreaWiseRetailers(companyId);
            } catch (err) {
                console.log(err);
            }
        })();
    }, []);

    const fetchAreaWiseRetailers = async id => {
        try {
            const response = await fetch(`${API.areaRetailers()}${id}`);
            if (!response.ok) {
                throw new Error(
                    `API request failed with status: ${response.status}`,
                );
            }
            const jsonData = await response.json();
            setData(jsonData.data);
            const allRetailers = jsonData.data.flatMap(
                area => area.Area_Retailers,
            );
            setRetailers(allRetailers);
            setHtmlContent(createHtmlContent(allRetailers));
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    const handleAreaChange = item => {
        setSelectedArea(item.Area_Id);
        const selectedAreaData = data.find(
            area => area.Area_Id === item.Area_Id,
        );
        const retailersData = selectedAreaData
            ? selectedAreaData.Area_Retailers
            : [];
        setRetailers(retailersData);
        setHtmlContent(createHtmlContent(retailersData));
    };

    const createHtmlContent = data => {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Retailers Map</title>
                <style>
                    #map {
                        height: 100%;
                        width: 100%;
                    }
                    html, body {
                        height: 100%;
                        margin: 0;
                        padding: 0;
                    }
                    .info-window {
                        padding: 10px;
                        max-width: 200px;
                    }
                    .info-window h4 {
                        margin: 0 0 8px 0;
                    }
                    .info-window p {
                        margin: 0 0 5px 0;
                    }
                    .directions-link {
                        display: inline-block;
                        margin-top: 8px;
                        padding: 8px 12px;
                        background-color: #4285f4;
                        color: white;
                        text-decoration: none;
                        border-radius: 4px;
                        font-size: 14px;
                    }
                </style>
                <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyD4IuRFVcMjWo1qWvBrS3v4uvDXcCiq_c4"></script>
                <script>
                    function initMap() {
                        const map = new google.maps.Map(document.getElementById('map'), {
                            zoom: 10,
                            center: { lat: 9.9778524, lng: 78.0358532 }
                        });

                        const retailers = ${JSON.stringify(data)};
                        const bounds = new google.maps.LatLngBounds();

                        retailers.forEach(retailer => {
                            let coordinates = null;
                            if (retailer.Latitude && retailer.Longitude) {
                                coordinates = { 
                                    lat: parseFloat(retailer.Latitude), 
                                    lng: parseFloat(retailer.Longitude) 
                                };
                            } else if (retailer.VERIFIED_LOCATION) {
                                try {
                                    const verifiedLocation = JSON.parse(retailer.VERIFIED_LOCATION);
                                    if (verifiedLocation.latitude && verifiedLocation.longitude) {
                                        coordinates = { 
                                            lat: parseFloat(verifiedLocation.latitude), 
                                            lng: parseFloat(verifiedLocation.longitude) 
                                        };
                                    }
                                } catch (e) {
                                    console.error('Error parsing location:', e);
                                }
                            }

                            if (coordinates && !isNaN(coordinates.lat) && !isNaN(coordinates.lng)) {
                                const marker = new google.maps.Marker({
                                    position: coordinates,
                                    map: map
                                });

                                const infoContent = \`
                                    <div class="info-window">
                                        <h4>\${retailer.Retailer_Name}</h4>
                                        <p>\${retailer.Reatailer_City || ''}</p>
                                        <p>\${retailer.Reatailer_Address || ''}</p>
                                        <a href="https://www.google.com/maps/dir/?api=1&destination=\${coordinates.lat},\${coordinates.lng}" 
                                           class="directions-link" 
                                           target="_blank">
                                           Get Directions
                                        </a>
                                    </div>
                                \`;

                                const infowindow = new google.maps.InfoWindow({
                                    content: infoContent
                                });

                                marker.addListener('click', () => {
                                    infowindow.open(map, marker);
                                });

                                bounds.extend(coordinates);
                            }
                        });

                        if (!bounds.isEmpty()) {
                            map.fitBounds(bounds);
                        }
                    }

                    window.onload = initMap;
                </script>
            </head>
            <body>
                <div id="map"></div>
            </body>
            </html>
        `;
    };

    return (
        <View style={styles.container}>
            <AppHeader title="Store Locator Map" navigation={navigation} />

            <View style={styles.contentContainer}>
                <View style={styles.dropdownContainer}>
                    <EnhancedDropdown
                        data={data}
                        labelField="Area_Name"
                        valueField="Area_Id"
                        placeholder="Select Area"
                        value={selectedArea}
                        onChange={item => handleAreaChange(item)}
                    />
                </View>

                <WebView
                    // pullToRefreshEnabled={true}
                    originWhitelist={["*"]}
                    source={{ html: htmlContent }}
                    style={styles.webview}
                />
            </View>
        </View>
    );
};

export default RetailerMapView;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primary,
    },
    contentContainer: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.white,
    },
    dropdownContainer: {
        margin: 10,
    },
    webview: {
        flex: 1,
    },
});
