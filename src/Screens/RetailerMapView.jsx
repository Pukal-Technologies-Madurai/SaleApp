import { FlatList, StyleSheet, Text, useColorScheme, View } from 'react-native'
import React, { useState, useEffect } from 'react'
// import MapView, { Marker, Callout } from 'react-native-maps';

import { customColors, typography } from '../Config/helper';
import { API } from '../Config/Endpoint';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { Dropdown } from 'react-native-element-dropdown';

const RetailerMapView = () => {
    const scheme = useColorScheme();
    const colors = customColors;

    const [data, setData] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);
    const [retailers, setRetailers] = useState([]);
    const [htmlContent, setHtmlContent] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const companyId = await AsyncStorage.getItem('Company_Id');
                fetchAreaWiseRetailers(companyId)
            } catch (err) {
                console.log(err);
            }
        })();
    }, []);

    const fetchAreaWiseRetailers = async (id) => {
        try {
            const response = await fetch(`${API.areaRetailers}${id}`);
            if (!response.ok) {
                throw new Error(`API request failed with status: ${response.status}`);
            }
            const jsonData = await response.json();
            setData(jsonData.data);
            const allRetailers = jsonData.data.flatMap(area => area.Area_Retailers);
            setRetailers(allRetailers);
            setHtmlContent(createHtmlContent(allRetailers));
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    const handleAreaChange = (item) => {
        setSelectedArea(item.Area_Id);
        const selectedAreaData = data.find(area => area.Area_Id === item.Area_Id);
        const retailersData = selectedAreaData ? selectedAreaData.Area_Retailers : [];
        setRetailers(retailersData);
        setHtmlContent(createHtmlContent(retailersData));
    };

    const createHtmlContent = (data) => {
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
                </style>
                <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyD4IuRFVcMjWo1qWvBrS3v4uvDXcCiq_c4"></script>
                <script>
                    function initMap() {
                        const map = new google.maps.Map(document.getElementById('map'), {
                            zoom: 10,
                            center: { lat: 9.9778524, lng: 78.0358532 }
                        });

                        const retailers = ${JSON.stringify(data)};

                        retailers.forEach(retailer => {
                            let coordinates = null;
                            if (retailer.Latitude && retailer.Longitude) {
                                coordinates = { lat: parseFloat(retailer.Latitude), lng: parseFloat(retailer.Longitude) };
                            } else if (retailer.VERIFIED_LOCATION) {
                                const verifiedLocation = JSON.parse(retailer.VERIFIED_LOCATION);
                                if (verifiedLocation.latitude && verifiedLocation.longitude) {
                                    coordinates = { lat: parseFloat(verifiedLocation.latitude), lng: parseFloat(verifiedLocation.longitude) };
                                }
                            }

                            if (coordinates) {
                                const marker = new google.maps.Marker({
                                    position: coordinates,
                                    map: map
                                });

                                const infowindow = new google.maps.InfoWindow({
                                    content: \`<h4>\${retailer.Retailer_Name}</h4><p>\${retailer.Reatailer_City}</p>\`
                                });

                                marker.addListener('click', () => {
                                    infowindow.open(map, marker);
                                });
                            }
                        });
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
        <View style={styles(colors).container}>
            <Dropdown
                data={data}
                labelField="Area_Name"
                valueField="Area_Id"
                placeholder="Select Area"
                maxHeight={300}
                search
                value={selectedArea}
                onChange={item => handleAreaChange(item)}
                style={styles(colors).dropdown}
                placeholderStyle={styles(colors).placeholderStyle}
                containerStyle={styles(colors).dropdownContainer}
                selectedTextStyle={styles(colors).selectedTextStyle}
                inputSearchStyle={{
                    borderColor: colors.black,
                    borderRadius: 10,
                }}
                searchPlaceholder="Search area..."
            />

            <WebView
                // pullToRefreshEnabled={true}
                originWhitelist={['*']}
                source={{ html: htmlContent }}
                style={styles(colors).webview}
            />
        </View>
    )
}

export default RetailerMapView

const styles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    webview: {
        flex: 1,
    },
    dropdown: {
        // width: "45%",
        // height: 50,
        // paddingHorizontal: 8,
        // backgroundColor: colors.secondary,

        margin: 20,
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 30
    },
    dropdownContainer: {
        backgroundColor: colors.secondary,
        borderColor: colors.text,
        borderWidth: 1,
        borderRadius: 10,
    },
    placeholderStyle: {
        ...typography.body1(colors),
    },
    selectedTextStyle: {
        // borderColor: colors.black,
        // borderWidth: 1,
        ...typography.body1(colors),
    },
})