import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ApiOfficial, ApiTextLineItem, fetchCommittee, toAbsoluteAssetUrl } from '@/services/publicApi';

type PastCommodore = {
  years: string;
  name: string;
  vessel: string;
};

type HonoraryMember = {
  name: string;
  details: string;
};

function committeeEmailOverrides(official: ApiOfficial) {
  const normalizedName = (official.name || '').trim().toUpperCase();

  if (normalizedName === 'KEVIN FINN') {
    return {
      email: null,
      email_2: null,
    };
  }

  if (normalizedName === 'HOWARD BROOKS') {
    return {
      email: 'Commodore@adls.org.uk',
      email_2: null,
    };
  }

  if (normalizedName === 'HEATHER DENNETT') {
    return {
      email: 'Vice.Commodore@adls.org.uk',
      email_2: null,
    };
  }

  return {
    email: official.email,
    email_2: official.email_2,
  };
}

function parseRoles(value: string | null) {
  if (!value) return [];
  return value.split(',').map((role) => role.trim()).filter(Boolean);
}

function parsePastCommodoreRow(item: ApiTextLineItem): PastCommodore {
  const row = item.text_line.trim();
  const match = row.match(/^(\d{4}\s*-\s*\d{4})\s+(.*?)\s+-\s+(.*)$/);
  if (!match) {
    return {
      years: '-',
      name: row,
      vessel: '-',
    };
  }

  return {
    years: match[1],
    name: match[2],
    vessel: match[3],
  };
}

function parseHonoraryMemberRow(item: ApiTextLineItem): HonoraryMember {
  const row = item.text_line.trim();
  const normalized = row.endsWith('.') ? row.slice(0, -1) : row;

  const commaIndex = normalized.indexOf(',');
  if (commaIndex > 0) {
    return {
      name: normalized.slice(0, commaIndex).trim(),
      details: normalized.slice(commaIndex + 1).trim() || '-',
    };
  }

  return {
    name: normalized,
    details: '-',
  };
}

function OfficialCard({ official, isTablet }: { official: ApiOfficial; isTablet: boolean }) {
  const imageUrl = toAbsoluteAssetUrl(official.image_path);
  const roles = parseRoles(official.role);
  const emails = committeeEmailOverrides(official);

  return (
    <View style={[styles.memberCard, isTablet && styles.memberCardTablet]}>
      {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.memberImage} /> : null}
      <Text style={styles.memberName}>{official.name || 'Unknown'}</Text>
      {roles.map((role) => (
        <Text key={`${official.id}-${role}`} style={styles.memberRole}>
          {role}
        </Text>
      ))}
      {official.ship ? <Text style={styles.memberMeta}>{official.ship.replaceAll("'", '')}</Text> : null}
      {emails.email ? <Text style={styles.memberEmail}>{emails.email}</Text> : null}
      {emails.email_2 ? <Text style={styles.memberEmail}>{emails.email_2}</Text> : null}
    </View>
  );
}

export default function CommitteeScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 900;

  const [flagOfficers, setFlagOfficers] = useState<ApiOfficial[]>([]);
  const [committee, setCommittee] = useState<ApiOfficial[]>([]);
  const [vacantRoles, setVacantRoles] = useState<ApiTextLineItem[]>([]);
  const [pastCommodoresRows, setPastCommodoresRows] = useState<ApiTextLineItem[]>([]);
  const [honoraryMembers, setHonoraryMembers] = useState<ApiTextLineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pastCommodores = useMemo(() => pastCommodoresRows.map(parsePastCommodoreRow), [pastCommodoresRows]);
  const honoraryRows = useMemo(() => honoraryMembers.map(parseHonoraryMemberRow), [honoraryMembers]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await fetchCommittee();
        if (!mounted) return;
        setFlagOfficers(response.flag_officers);
        setCommittee(response.committee);
        setVacantRoles(response.vacant_roles);
        setPastCommodoresRows(response.past_commodores);
        setHonoraryMembers(response.honorary_members);
      } catch {
        if (!mounted) return;
        setError('Unable to load committee data .');
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
      <Text style={styles.title}>Flag Officers & Committee</Text>

      {isLoading ? <ActivityIndicator size="small" color="#0E4A72" /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Text style={styles.sectionTitle}>Flag Officers</Text>
      <View style={[styles.membersGrid, isTablet && styles.membersGridTablet]}>
        {flagOfficers.map((official) => (
          <OfficialCard key={official.id} official={official} isTablet={isTablet} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Committee</Text>
      <View style={[styles.membersGrid, isTablet && styles.membersGridTablet]}>
        {committee.map((official) => (
          <OfficialCard key={official.id} official={official} isTablet={isTablet} />
        ))}
      </View>

      {vacantRoles.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Vacant Roles</Text>
          {vacantRoles.map((entry) => (
            <Text key={entry.id} style={styles.listText}>
              {entry.text_line}
            </Text>
          ))}
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Past Commodores</Text>
      <Text style={styles.sectionSub}>Chronological order</Text>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.yearsCell]}>Years</Text>
          <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
          <Text style={[styles.headerCell, styles.vesselCell]}>Vessel</Text>
        </View>
        {pastCommodores.map((entry, index) => (
          <View key={`${entry.years}-${entry.name}-${index}`} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
            <Text style={[styles.cell, styles.yearsCell]}>{entry.years}</Text>
            <Text style={[styles.cell, styles.nameCell]}>{entry.name}</Text>
            <Text style={[styles.cell, styles.vesselCell]}>{entry.vessel}</Text>
          </View>
        ))}
      </View>

      {honoraryMembers.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Honorary Members</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.honoraryNameCell]}>Name</Text>
              <Text style={[styles.headerCell, styles.honoraryDetailsCell]}>Details</Text>
            </View>
            {honoraryRows.map((entry, index) => (
              <View key={`${entry.name}-${index}`} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.cell, styles.honoraryNameCell]}>{entry.name}</Text>
                <Text style={[styles.cell, styles.honoraryDetailsCell]}>{entry.details}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
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
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#355A74',
    lineHeight: 20,
    marginBottom: 4,
  },
  membersGrid: {
    gap: 12,
  },
  membersGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E2EC',
    padding: 12,
    alignItems: 'center',
  },
  memberCardTablet: {
    width: '49%',
  },
  memberImage: {
    width: 124,
    height: 124,
    borderRadius: 62,
    marginBottom: 10,
  },
  memberName: {
    color: '#123C5C',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  memberRole: {
    marginTop: 3,
    color: '#355A74',
    textAlign: 'center',
    fontWeight: '600',
  },
  memberMeta: {
    marginTop: 5,
    color: '#4C6C84',
    textAlign: 'center',
  },
  memberEmail: {
    marginTop: 4,
    color: '#0E4A72',
    textAlign: 'center',
    fontSize: 13,
  },
  sectionTitle: {
    marginTop: 8,
    color: '#0E2E4A',
    fontSize: 22,
    fontWeight: '700',
  },
  sectionSub: {
    color: '#46627A',
    marginBottom: 2,
  },
  table: {
    borderWidth: 1,
    borderColor: '#D8E2EC',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0E4A72',
  },
  headerCell: {
    color: '#FFFFFF',
    fontWeight: '700',
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E2E9F0',
  },
  tableRowAlt: {
    backgroundColor: '#F8FBFE',
  },
  cell: {
    color: '#1E425E',
    paddingVertical: 9,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  yearsCell: {
    width: '28%',
  },
  nameCell: {
    width: '38%',
  },
  vesselCell: {
    width: '34%',
  },
  honoraryNameCell: {
    width: '32%',
  },
  honoraryDetailsCell: {
    width: '68%',
  },
  listText: {
    color: '#355A74',
    lineHeight: 20,
    marginTop: 2,
  },
  errorText: {
    color: '#B00020',
  },
});
