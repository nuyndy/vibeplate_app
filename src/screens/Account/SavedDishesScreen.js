import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, FlatList, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { auth, db } from '../../firebase/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

export default function SavedDishesScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      headerTitle: "Món đã lưu"
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const colRef = collection(db, "users", user.email.toLowerCase(), "saved");
      const snapshot = await getDocs(colRef);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setData(list);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.photo_url }} style={styles.image} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.name}>{item.title}</Text>
              <Text>{item.category}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', marginBottom: 12, alignItems: 'center' },
  image: { width: 70, height: 70, borderRadius: 10 },
  name: { fontSize: 16, fontWeight: '600' }
});
