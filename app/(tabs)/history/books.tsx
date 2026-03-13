import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ApiRecommendedBook, fetchRecommendedBooks, toAbsoluteAssetUrl } from '@/services/publicApi';

function BookCard({
  book,
  isTablet,
}: {
  book: ApiRecommendedBook;
  isTablet: boolean;
}) {
  const image = toAbsoluteAssetUrl(book.image_path);
  const summary = [
    book.author ? `Author: ${book.author}` : null,
    book.publisher ? `Publisher: ${book.publisher}` : null,
    book.publication_date ? `Publication: ${book.publication_date}` : null,
    book.isbn ? `ISBN: ${book.isbn}` : null,
    book.note,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <View style={[styles.bookCard, isTablet && styles.bookCardTablet]}>
      <View style={styles.bookImageWrap}>
        {image ? <Image source={{ uri: image }} style={styles.bookImage} resizeMode="contain" /> : null}
      </View>
      <View style={styles.bookBody}>
        <Text style={styles.bookTitle}>{book.title}</Text>
        <Text style={styles.bookSummary}>{summary}</Text>
      </View>
    </View>
  );
}

export default function BooksScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 900;
  const [books, setBooks] = useState<ApiRecommendedBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await fetchRecommendedBooks();
        if (!mounted) return;
        setBooks(response);
      } catch {
        if (!mounted) return;
        setError('Unable to load books .');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Books</Text>
      <Text style={styles.subTitle}>Recommended ADLS reference books loaded.</Text>

      {isLoading ? <ActivityIndicator size="small" color="#0E4A72" /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={[styles.booksGrid, isTablet && styles.booksGridTablet]}>
        {books.map((book) => (
          <BookCard key={book.id} book={book} isTablet={isTablet} />
        ))}
      </View>

      {!isLoading && !error && books.length === 0 ? <Text style={styles.emptyText}>No books available.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F4F8FB',
    padding: 16,
    gap: 12,
  },
  title: {
    color: '#0E2E4A',
    fontSize: 26,
    fontWeight: '700',
  },
  subTitle: {
    color: '#3F6077',
    fontSize: 14,
    lineHeight: 20,
  },
  booksGrid: {
    gap: 10,
  },
  booksGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bookCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8E2EC',
    overflow: 'hidden',
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  bookCardTablet: {
    width: '49%',
    maxWidth: undefined,
    alignSelf: 'auto',
  },
  bookImageWrap: {
    width: '100%',
    height: 220,
    backgroundColor: '#F7FBFF',
    padding: 10,
  },
  bookImage: {
    width: '100%',
    height: '100%',
  },
  bookBody: {
    padding: 12,
  },
  bookTitle: {
    color: '#123C5C',
    fontSize: 16,
    fontWeight: '700',
  },
  bookSummary: {
    marginTop: 6,
    color: '#355A74',
    lineHeight: 20,
    fontSize: 13,
  },
  emptyText: {
    color: '#4A647B',
  },
  errorText: {
    color: '#B00020',
  },
});
