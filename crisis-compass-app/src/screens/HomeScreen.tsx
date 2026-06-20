import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Image,
  Clipboard,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../services/config';
import CrisisForm from '../components/CrisisForm';
import { CrisisResponse } from '../services/api';

function renderBody(text: string) {
  const phoneRegex = /(\+?\d[\d\s\-()]{7,}\d)/g;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const segments: { key: number; text: string; type: 'text' | 'phone' | 'url' }[] = [];
  let lastIndex = 0;
  const allMatches: { index: number; match: string; type: 'phone' | 'url' }[] = [];

  let m;
  while ((m = phoneRegex.exec(text)) !== null) {
    allMatches.push({ index: m.index, match: m[0].trim(), type: 'phone' });
  }
  while ((m = urlRegex.exec(text)) !== null) {
    allMatches.push({ index: m.index, match: m[0].trim(), type: 'url' });
  }
  allMatches.sort((a, b) => a.index - b.index);

  let key = 0;
  for (const matched of allMatches) {
    if (matched.index > lastIndex) {
      segments.push({ key: key++, text: text.slice(lastIndex, matched.index), type: 'text' });
    }
    segments.push({ key: key++, text: matched.match, type: matched.type });
    lastIndex = matched.index + matched.match.length;
  }
  if (lastIndex < text.length) {
    segments.push({ key: key++, text: text.slice(lastIndex), type: 'text' });
  }

  return segments.map((seg) => {
    if (seg.type === 'phone') {
      const digits = seg.text.replace(/[^+\d]/g, '');
      return (
        <TouchableOpacity key={seg.key} onPress={() => Linking.openURL(`tel:${digits}`)} style={styles.inlineLinkWrapper}>
          <Text style={styles.inlinePhone}>{seg.text}</Text>
        </TouchableOpacity>
      );
    }
    if (seg.type === 'url') {
      return (
        <TouchableOpacity key={seg.key} onPress={() => Linking.openURL(seg.text)} style={styles.inlineLinkWrapper}>
          <Text style={styles.inlineUrl}>{seg.text}</Text>
        </TouchableOpacity>
      );
    }
    return <Text key={seg.key} style={{ color: COLORS.textSecondary }}>{seg.text}</Text>;
  });
}

const sections = [
  { title: 'RESILIENCE MODULE', subtitle: 'Build mental strength through guided exercises and daily check-ins.' },
  { title: 'VISUAL FOCUS', subtitle: 'Calming visual aids and breathing guides to regain composure.' },
  { title: 'OPERATIONAL SUPPORT', subtitle: 'Real-time resource coordination and emergency contact mapping.' },
  { title: 'GUIDED PROTOCOLS', subtitle: 'Step-by-step tactical workflows for any situation.' },
];

export default function HomeScreen() {
  const [formVisible, setFormVisible] = useState(false);
  const [result, setResult] = useState<CrisisResponse | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'passport' | 'resources' | 'drafts'>('passport');
  const [resourceFilter, setResourceFilter] = useState<'all' | 'helplines' | 'places' | 'links'>('all');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameStepIndex, setGameStepIndex] = useState(0);
  const [gamePhase, setGamePhase] = useState<'main' | 'alternative' | 'helpline' | 'done'>('main');
  const scrollRef = useRef<ScrollView>(null);

  const handleResult = (r: CrisisResponse) => {
    setResult(r);
    setGameStarted(false);
    setGameStepIndex(0);
    setGamePhase('main');
    if (Platform.OS === 'web') {
      setSidebarOpen(true);
    }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 400);
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    if (Platform.OS === 'web') {
      const win = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
      if (win && win.navigator && win.navigator.clipboard) {
        win.navigator.clipboard.writeText(text);
      }
    }
    Alert.alert('Success', 'Copied to clipboard!');
  };

  const totalSteps = result?.steps?.length || 0;

  const handleStepYes = () => {
    if (gameStepIndex + 1 < totalSteps) {
      setGameStepIndex((prev) => prev + 1);
      setGamePhase('main');
    } else {
      setGamePhase('done');
    }
  };

  const handleStepNo = () => {
    if (gamePhase === 'main') {
      setGamePhase('alternative');
    } else if (gamePhase === 'alternative') {
      setGamePhase('helpline');
    }
  };

  const handleHelplineCall = () => {
    const num = result?.national_helplinenumber?.number;
    if (num) {
      Linking.openURL(`tel:${num}`);
    }
    if (gameStepIndex + 1 < totalSteps) {
      setGameStepIndex((prev) => prev + 1);
      setGamePhase('main');
    } else {
      setGamePhase('done');
    }
  };

  const renderPassportTab = () => {
    if (!result) return null;
    return (
      <View style={styles.tabContainer}>
        <LinearGradient
          colors={[COLORS.primaryDim, COLORS.surfaceLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.passportCard}
        >
          <View style={styles.passportHeader}>
            <Ionicons name="shield-checkmark-sharp" size={20} color="#fff" />
            <Text style={styles.passportHeaderTitle}>CRISIS PASSPORT</Text>
          </View>
          <View style={styles.passportField}>
            <Text style={styles.passportLabel}>CASE NUMBER</Text>
            <Text style={styles.passportValue}>{result.case_id}</Text>
          </View>
          <View style={styles.passportField}>
            <Text style={styles.passportLabel}>TIMESTAMP</Text>
            <Text style={styles.passportValue}>{result.timestamp}</Text>
          </View>
          <View style={styles.passportField}>
            <Text style={styles.passportLabel}>TOPIC</Text>
            <Text style={styles.passportValue}>{result.topic}</Text>
          </View>
          <View style={styles.passportField}>
            <Text style={styles.passportLabel}>LOCATION</Text>
            <Text style={styles.passportValue}>{result.location || 'India (National)'}</Text>
          </View>
          <View style={[styles.passportField, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={styles.passportLabel}>AI CONTEXT SUMMARY</Text>
            <Text style={styles.passportSummaryText}>{result.crisis_summary}</Text>
          </View>
        </LinearGradient>

        {result.passport_qr ? (
          <View style={styles.qrContainer}>
            <Image
              source={{ uri: result.passport_qr }}
              style={styles.qrImage as any}
              resizeMode="contain"
            />
            <Text style={styles.qrCaption}>Scan to share crisis context with workers</Text>
          </View>
        ) : null}

      </View>
    );
  };

  const renderResourcesTab = () => {
    if (!result) return null;
    const helplines: Array<{ name: string; phone: string; desc: string }> = [];
    if (result.national_helplinenumber?.number) {
      helplines.push({
        name: 'National Helpline',
        phone: String(result.national_helplinenumber.number),
        desc: `Verified topic helpline for ${result.topic}`,
      });
    }

    const places = result.places || [];
    const links = [...(result.web_links || [])];

    places.forEach((p) => {
      if (p.website && p.website !== 'N/A') {
        links.push({ title: p.name, url: p.website });
      }
    });

    return (
      <View style={styles.tabContainer}>
        <View style={styles.filterPills}>
          {(['all', 'helplines', 'places', 'links'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, resourceFilter === f && styles.filterPillActive]}
              onPress={() => setResourceFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, resourceFilter === f && styles.filterPillTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.resourceList}>
          {(resourceFilter === 'all' || resourceFilter === 'helplines') && (
            <View style={{ marginBottom: 18 }}>
              {helplines.length > 0 && <Text style={styles.resourceSectionTitle}>HELPLINES</Text>}
              {helplines.map((h, i) => (
                <View key={`h-${i}`} style={styles.resourceCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resourceCardName}>{h.name}</Text>
                    <Text style={styles.resourceCardDetail}>{h.phone}</Text>
                    <Text style={styles.resourceCardDesc}>{h.desc}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.resourceCallButton}
                    onPress={() => Linking.openURL(`tel:${h.phone}`)}
                  >
                    <Ionicons name="call" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {(resourceFilter === 'all' || resourceFilter === 'places') && (
            <View style={{ marginBottom: 18 }}>
              {places.length > 0 && <Text style={styles.resourceSectionTitle}>NEARBY SUPPORT</Text>}
              {places.map((p, i) => (
                <View key={`p-${i}`} style={styles.resourceCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resourceCardName}>{p.name}</Text>
                    <Text style={styles.resourceCardDetail}>
                      {p.phone !== 'N/A' ? p.phone : 'No phone number available'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {p.phone !== 'N/A' && (
                      <TouchableOpacity
                        style={styles.resourceCallButton}
                        onPress={() => Linking.openURL(`tel:${p.phone.replace(/[^+\d]/g, '')}`)}
                      >
                        <Ionicons name="call" size={16} color="#fff" />
                      </TouchableOpacity>
                    )}
                    {p.website !== 'N/A' && (
                      <TouchableOpacity
                        style={[styles.resourceCallButton, { backgroundColor: COLORS.surfaceLight }]}
                        onPress={() => Linking.openURL(p.website)}
                      >
                        <Ionicons name="earth" size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {(resourceFilter === 'all' || resourceFilter === 'links') && (
            <View style={{ marginBottom: 18 }}>
              {links.length > 0 && <Text style={styles.resourceSectionTitle}>RESOURCE WEBSITES</Text>}
              {links.map((l, i) => (
                <TouchableOpacity
                  key={`l-${i}`}
                  style={styles.resourceLinkCard}
                  onPress={() => Linking.openURL(l.url)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="link-sharp" size={16} color={COLORS.primary} style={{ marginRight: 10 }} />
                  <Text style={styles.resourceLinkText} numberOfLines={1}>
                    {l.title}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              ))}
              {links.length === 0 && <Text style={styles.emptyText}>No websites available</Text>}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderDraftsTab = () => {
    if (!result) return null;
    return (
      <View style={styles.tabContainer}>
        <View style={styles.draftBox}>
          <View style={styles.draftBoxHeader}>
            <Ionicons name="call-sharp" size={18} color={COLORS.accent} style={{ marginRight: 8 }} />
            <Text style={styles.draftBoxTitle}>NGO CALL SCRIPT</Text>
          </View>
          <Text style={styles.draftBoxText}>"{result.call_script}"</Text>
          <TouchableOpacity
            style={styles.copyPill}
            onPress={() => copyToClipboard(result.call_script)}
            activeOpacity={0.8}
          >
            <Ionicons name="copy-outline" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.copyPillText}>COPY SCRIPT</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.draftBox}>
          <View style={styles.draftBoxHeader}>
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" style={{ marginRight: 8 }} />
            <Text style={styles.draftBoxTitle}>SMS / WHATSAPP TEMPLATE</Text>
          </View>
          <Text style={styles.draftBoxText}>"{result.message_draft}"</Text>
          <TouchableOpacity
            style={styles.copyPill}
            onPress={() => copyToClipboard(result.message_draft)}
            activeOpacity={0.8}
          >
            <Ionicons name="copy-outline" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.copyPillText}>COPY TEMPLATE</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Fixed Branding Nav Bar */}
      <View style={styles.navHeader}>
        <View style={styles.logoGroup}>
          <Ionicons name="compass" size={24} color={COLORS.primary} style={{ marginRight: 10 }} />
          <Text style={styles.logoText}>CRISIS COMPASS</Text>
        </View>
        {result && (
          <TouchableOpacity
            style={[styles.sidebarTrigger, sidebarOpen && styles.sidebarTriggerActive]}
            onPress={() => setSidebarOpen((prev) => !prev)}
            activeOpacity={0.8}
          >
            <Ionicons name={sidebarOpen ? 'folder-open' : 'folder'} size={18} color={sidebarOpen ? '#fff' : COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.sidebarTriggerText, sidebarOpen && { color: '#fff' }]}>
              {sidebarOpen ? 'CLOSE DOSSIER' : 'OPEN DOSSIER'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.mainLayout}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#0D0D0D', '#1A1A2E', '#0D0D0D']} style={styles.hero}>
            <Text style={styles.heroTitle}>TACTICAL CRISIS RESPONDER</Text>
            <Text style={styles.heroSubtitle}>
              Connecting distress to immediate action protocols.
            </Text>
          </LinearGradient>

          <View style={styles.quoteCard}>
            <Text style={styles.quoteText}>
              Crisis Compass provides authoritative, step-by-step guidance during critical moments. We bridge the gap between chaos and clarity with immediate response protocols and verified support networks.
            </Text>
          </View>

          <View style={styles.sectionsContainer}>
            {sections.map((section, i) => (
              <View key={i} style={styles.sectionCard}>
                <View style={styles.sectionNumber}>
                  <Text style={styles.sectionNumberText}>{String(i + 1).padStart(2, '0')}</Text>
                </View>
                <View style={styles.sectionContent}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => setFormVisible(true)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#00B4D8', '#0077B6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>EXPLAIN YOUR CRISIS</Text>
            </LinearGradient>
          </TouchableOpacity>

          {result && (
            <View style={styles.resultsWrapper}>
              <View style={styles.resultsDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>RESULTS</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Quick Actions Panel */}
              <View style={styles.quickActionsBox}>
                <Text style={styles.quickActionsHeader}>CASE DOSSIER ACTIONS</Text>
                <View style={styles.quickActionsRow}>
                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    onPress={() => {
                      setSidebarOpen(true);
                      setActiveTab('passport');
                    }}
                  >
                    <Ionicons name="card" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.quickActionBtnText}>VIEW PASSPORT & QR</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {result.national_helplinenumber?.number && (
                <View style={styles.helplineCard}>
                  <LinearGradient colors={['#0077B6', '#00B4D8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.helplineGradient}>
                    <Text style={styles.helplineLabel}>RECOMMENDED NATIONAL HELPLINE</Text>
                    <Text style={styles.helplineNumber}>{result.national_helplinenumber.number}</Text>
                    <TouchableOpacity
                      style={styles.helplineCallButton}
                      onPress={() => {
                        const num = result?.national_helplinenumber?.number;
                        if (num) {
                          Linking.openURL(`tel:${num}`);
                        }
                      }}
                    >
                      <Text style={styles.helplineCallText}>CALL NOW</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              )}

              {result.national_helpline_search && result.national_helpline_search !== "No national helpline needed." && (
                <View style={styles.searchResultCard}>
                  <Text style={styles.searchResultTitle}>Search Results & Fallbacks</Text>
                  <Text style={styles.searchResultText}>{result.national_helpline_search}</Text>
                </View>
              )}

              {/* Game Mode — Step-by-Step Guided Action Plan */}
              {result.steps && result.steps.length > 0 ? (
                <>
                  {/* Start button when game hasn't begun */}
                  {!gameStarted && (
                    <TouchableOpacity
                      style={styles.gameStartButton}
                      onPress={() => {
                        setGameStarted(true);
                        setGameStepIndex(0);
                        setGamePhase('main');
                        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
                      }}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={['#4CAF50', '#2E7D32']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gameStartGradient}
                      >
                        <Ionicons name="play-circle-sharp" size={24} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={styles.gameStartText}>BEGIN GUIDED ACTION PLAN</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  {/* Gamified step flow */}
                  {gameStarted && (
                    <View style={styles.gameContainer}>
                      {/* Progress header */}
                      {gamePhase !== 'done' && (
                        <>
                          <View style={styles.gameProgressRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons
                                name={gamePhase === 'main' ? 'flag-sharp' : gamePhase === 'alternative' ? 'repeat' : 'alert-circle'}
                                size={16}
                                color={gamePhase === 'main' ? COLORS.primary : gamePhase === 'alternative' ? '#FF9800' : '#FF5252'}
                                style={{ marginRight: 6 }}
                              />
                              <Text style={styles.gameStepCounter}>Step {gameStepIndex + 1} of {totalSteps}</Text>
                            </View>
                            <View style={[styles.gamePhaseBadge, {
                              backgroundColor: gamePhase === 'main' ? COLORS.primaryDim + '44' : gamePhase === 'alternative' ? '#FF980022' : '#FF525222',
                              borderColor: gamePhase === 'main' ? COLORS.primary : gamePhase === 'alternative' ? '#FF9800' : '#FF5252',
                            }]}>
                              <Text style={[styles.gamePhaseBadgeText, {
                                color: gamePhase === 'main' ? COLORS.primary : gamePhase === 'alternative' ? '#FF9800' : '#FF5252',
                              }]}>
                                {gamePhase === 'main' ? 'TASK' : gamePhase === 'alternative' ? 'ALTERNATIVE' : 'HELPLINE'}
                              </Text>
                            </View>
                          </View>

                          {/* Progress bar */}
                          <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, {
                              width: `${(gameStepIndex / Math.max(totalSteps, 1)) * 100}%`,
                              backgroundColor: gamePhase === 'helpline' ? '#FF5252' : COLORS.primary,
                            }]} />
                          </View>
                        </>
                      )}

                      {/* DONE — All steps completed */}
                      {gamePhase === 'done' ? (
                        <View style={styles.gameDoneCard}>
                          <LinearGradient
                            colors={['#1B5E20', '#4CAF50']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.gameDoneGradient}
                          >
                            <Ionicons name="checkmark-circle-sharp" size={48} color="#fff" />
                            <Text style={styles.gameDoneTitle}>ALL STEPS COMPLETED</Text>
                            <Text style={styles.gameDoneSubtitle}>You've worked through your entire action plan.</Text>
                          </LinearGradient>

                          {/* Show drafted communications on completion */}
                          <View style={styles.gameDoneComms}>
                            <Text style={styles.gameDoneCommsLabel}>YOUR DRAFTED COMMUNICATIONS</Text>
                            <View style={styles.draftCardMain}>
                              <Text style={styles.draftCardTitleMain}>NGO Call Script</Text>
                              <Text style={styles.draftCardTextMain}>"{result.call_script}"</Text>
                              <TouchableOpacity
                                style={styles.draftCardCopyBtn}
                                onPress={() => copyToClipboard(result.call_script)}
                              >
                                <Ionicons name="copy-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                                <Text style={styles.draftCardCopyText}>Copy Script</Text>
                              </TouchableOpacity>
                            </View>
                            <View style={styles.draftCardMain}>
                              <Text style={styles.draftCardTitleMain}>SMS / WhatsApp Message Draft</Text>
                              <Text style={styles.draftCardTextMain}>"{result.message_draft}"</Text>
                              <TouchableOpacity
                                style={styles.draftCardCopyBtn}
                                onPress={() => copyToClipboard(result.message_draft)}
                              >
                                <Ionicons name="copy-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                                <Text style={styles.draftCardCopyText}>Copy Message</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          <TouchableOpacity
                            style={styles.gameResetButton}
                            onPress={() => {
                              setGameStarted(false);
                              setGameStepIndex(0);
                              setGamePhase('main');
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="refresh-sharp" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                            <Text style={styles.gameResetText}>REVIEW ACTION PLAN AGAIN</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        /* Active step card */
                        <>
                          <View style={styles.gameStepCard}>
                            {/* Step number badge */}
                            <View style={styles.stepHeader}>
                              <LinearGradient
                                colors={gamePhase === 'helpline' ? ['#FF5252', '#C62828'] : ['#0077B6', '#00B4D8']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.stepBadge}
                              >
                                <Text style={styles.stepBadgeText}>{gameStepIndex + 1}</Text>
                              </LinearGradient>
                              <Text style={styles.stepTitle}>{result.steps[gameStepIndex].title}</Text>
                            </View>

                            {/* Main phase — show action */}
                            {gamePhase === 'main' && (
                              <>
                                <Text style={styles.stepBody}>{renderBody(result.steps[gameStepIndex].body)}</Text>
                                <View style={styles.actionHighlightBox}>
                                  <Ionicons name="flash-sharp" size={16} color="#FF9800" style={{ marginRight: 8 }} />
                                  <Text style={styles.actionHighlightText}>{result.steps[gameStepIndex].action}</Text>
                                </View>
                              </>
                            )}

                            {/* Alternative phase — show alternative */}
                            {gamePhase === 'alternative' && (
                              <>
                                <View style={styles.altBadgeRow}>
                                  <Ionicons name="repeat" size={16} color="#FF9800" style={{ marginRight: 6 }} />
                                  <Text style={styles.altBadgeText}>TRY THIS INSTEAD</Text>
                                </View>
                                <Text style={styles.stepBody}>{renderBody(result.steps[gameStepIndex].alternative)}</Text>
                              </>
                            )}

                            {/* Helpline phase — emergency call */}
                            {gamePhase === 'helpline' && (
                              <>
                                <View style={styles.helplineCrisisBadge}>
                                  <Ionicons name="warning-sharp" size={20} color="#fff" style={{ marginRight: 8 }} />
                                  <Text style={styles.helplineCrisisLabel}>NEED HELP WITH THIS STEP?</Text>
                                </View>
                                <Text style={styles.helplineCrisisBody}>
                                  It's okay. Call the helpline number below. They will guide you through this step over the phone.
                                </Text>
                                {result.national_helplinenumber?.number ? (
                                  <View style={styles.helplineBigNumberBox}>
                                    <Text style={styles.helplineBigNumber}>{result.national_helplinenumber.number}</Text>
                                    <Text style={styles.helplineBigLabel}>NATIONAL HELPLINE — 24/7</Text>
                                  </View>
                                ) : (
                                  <View style={styles.helplineBigNumberBox}>
                                    <Text style={styles.helplineBigNumber}>112</Text>
                                    <Text style={styles.helplineBigLabel}>UNIVERSAL EMERGENCY — 24/7</Text>
                                  </View>
                                )}
                              </>
                            )}
                          </View>

                          {/* Action buttons */}
                          {gamePhase === 'main' && (
                            <View style={styles.gameButtonRow}>
                              <TouchableOpacity style={styles.gameYesButton} onPress={handleStepYes} activeOpacity={0.8}>
                                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.gameYesButtonText}>I CAN DO THIS</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.gameNoButton} onPress={handleStepNo} activeOpacity={0.8}>
                                <Ionicons name="close-circle" size={20} color="#FF5252" style={{ marginRight: 8 }} />
                                <Text style={styles.gameNoButtonText}>I CAN'T DO THIS</Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          {gamePhase === 'alternative' && (
                            <View style={styles.gameButtonRow}>
                              <TouchableOpacity style={[styles.gameYesButton, { backgroundColor: '#E65100' }]} onPress={handleStepYes} activeOpacity={0.8}>
                                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.gameYesButtonText}>I CAN DO THIS ALTERNATIVE</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.gameNoButton} onPress={handleStepNo} activeOpacity={0.8}>
                                <Ionicons name="close-circle" size={20} color="#FF5252" style={{ marginRight: 8 }} />
                                <Text style={styles.gameNoButtonText}>STILL CAN'T DO IT</Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          {gamePhase === 'helpline' && (
                            <TouchableOpacity style={styles.gameCallButton} onPress={handleHelplineCall} activeOpacity={0.85}>
                              <Ionicons name="call-sharp" size={22} color="#fff" style={{ marginRight: 10 }} />
                              <Text style={styles.gameCallButtonText}>
                                CALL {result.national_helplinenumber?.number || '112'} NOW
                              </Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </>
              ) : null}

              <View style={styles.placesHeader}>
                <Text style={styles.placesHeaderTitle}>NEARBY EMERGENCY SUPPORT — {result.places.length} PLACES</Text>
              </View>
              {result.places.map((place, i) => (
                <View key={i} style={styles.placeCard}>
                  <View style={styles.placeIndex}>
                    <Text style={styles.placeIndexText}>{String(i + 1).padStart(2, '0')}</Text>
                  </View>
                  <View style={styles.placeDetails}>
                    <Text style={styles.placeName}>{place.name}</Text>
                    <View style={styles.placeContactRow}>
                      {place.phone && place.phone !== 'N/A' ? (
                        <TouchableOpacity onPress={() => Linking.openURL(`tel:${place.phone.replace(/[^+\d]/g, '')}`)} style={styles.contactChip}>
                          <Text style={styles.contactChipText}>{place.phone}</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.noContact}>No phone contact</Text>
                      )}
                      {place.website && place.website !== 'N/A' ? (
                        <TouchableOpacity onPress={() => Linking.openURL(place.website)} style={styles.websiteChip}>
                          <Text style={styles.websiteChipText}>Website Link</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>

        {/* Sidebar Container */}
        {sidebarOpen && result && (
          <View style={Platform.OS === 'web' ? styles.webSidebar : styles.mobileSidebar}>
            {/* Sidebar Title Info */}
            <View style={styles.sidebarHeader}>
              <View>
                <Text style={styles.sidebarHeaderTitle}>CASE DOSSIER</Text>
                <Text style={styles.sidebarHeaderSubtitle}>{result.case_id}</Text>
              </View>
              <TouchableOpacity onPress={() => setSidebarOpen(false)} style={styles.sidebarCloseBtn}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Sidebar Tabs */}
            <View style={styles.sidebarTabs}>
              <TouchableOpacity
                style={[styles.sidebarTab, activeTab === 'passport' && styles.sidebarTabActive]}
                onPress={() => setActiveTab('passport')}
                activeOpacity={0.8}
              >
                <Ionicons name="card-sharp" size={16} color={activeTab === 'passport' ? COLORS.primary : COLORS.textMuted} />
                <Text style={[styles.sidebarTabLabel, activeTab === 'passport' && styles.sidebarTabLabelActive]}>Passport</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sidebarTab, activeTab === 'resources' && styles.sidebarTabActive]}
                onPress={() => setActiveTab('resources')}
                activeOpacity={0.8}
              >
                <Ionicons name="filter" size={16} color={activeTab === 'resources' ? COLORS.primary : COLORS.textMuted} />
                <Text style={[styles.sidebarTabLabel, activeTab === 'resources' && styles.sidebarTabLabelActive]}>Media</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sidebarTab, activeTab === 'drafts' && styles.sidebarTabActive]}
                onPress={() => setActiveTab('drafts')}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbox-ellipses" size={16} color={activeTab === 'drafts' ? COLORS.primary : COLORS.textMuted} />
                <Text style={[styles.sidebarTabLabel, activeTab === 'drafts' && styles.sidebarTabLabelActive]}>Drafts</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable Sidebar Content */}
            <ScrollView contentContainerStyle={styles.sidebarContentScroll} showsVerticalScrollIndicator={false}>
              {activeTab === 'passport' && renderPassportTab()}
              {activeTab === 'resources' && renderResourcesTab()}
              {activeTab === 'drafts' && renderDraftsTab()}
            </ScrollView>
          </View>
        )}
      </View>

      <CrisisForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onResult={handleResult}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  navHeader: {
    height: 60,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logoGroup: { flexDirection: 'row', alignItems: 'center' },
  logoText: { color: COLORS.text, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  sidebarTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primaryDim,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sidebarTriggerActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.primary,
  },
  sidebarTriggerText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  mainLayout: { flex: 1, flexDirection: 'row' },
  scroll: { paddingBottom: 20 },
  hero: { paddingTop: 60, paddingBottom: 40, paddingHorizontal: 24, alignItems: 'center' },
  heroTitle: { color: COLORS.text, fontSize: 26, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
  heroSubtitle: { color: COLORS.accent, fontSize: FONTS.body, fontStyle: 'italic', marginTop: 12, textAlign: 'center' },
  quoteCard: {
    marginHorizontal: 20, backgroundColor: COLORS.card, borderRadius: 16, padding: 20,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary, marginBottom: 16, marginTop: 16,
  },
  quoteText: { color: COLORS.textSecondary, fontSize: FONTS.body, lineHeight: 24 },
  sectionsContainer: { paddingHorizontal: 20, gap: 12, marginBottom: 28 },
  sectionCard: {
    flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sectionNumber: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  sectionNumberText: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },
  sectionContent: { flex: 1 },
  sectionTitle: { color: COLORS.text, fontSize: FONTS.body, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  sectionSubtitle: { color: COLORS.textMuted, fontSize: FONTS.caption, lineHeight: 18 },
  ctaButton: {
    marginHorizontal: 20, borderRadius: 18, overflow: 'hidden', elevation: 8,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  ctaGradient: { paddingVertical: 18, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2 },

  resultsWrapper: { paddingHorizontal: 20, marginTop: 32 },
  resultsDivider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginHorizontal: 12 },

  quickActionsBox: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  quickActionsHeader: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  quickActionsRow: { flexDirection: 'row', gap: 10 },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryDim,
    paddingVertical: 12,
    borderRadius: 10,
  },
  quickActionBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  helplineCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 20, elevation: 6, shadowColor: '#00B4D8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10 },
  helplineGradient: { padding: 24, alignItems: 'center' },
  helplineLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800', letterSpacing: 2, textAlign: 'center' },
  helplineNumber: { color: '#fff', fontSize: 38, fontWeight: '900', letterSpacing: 2, marginVertical: 8 },
  helplineCallButton: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 28,
    paddingVertical: 10, marginTop: 4,
  },
  helplineCallText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 2 },

  searchResultCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 20,
  },
  searchResultTitle: { color: COLORS.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  searchResultText: { color: COLORS.textSecondary, fontSize: FONTS.caption, lineHeight: 18 },

  guidanceSection: { marginBottom: 20 },
  guidanceSectionLabel: {
    color: COLORS.primary, fontSize: 13, fontWeight: '800', letterSpacing: 2,
    marginBottom: 14,
  },
  stepCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 12,
  },
  stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepBadge: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  stepBadgeText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  stepTitle: { color: COLORS.text, fontSize: FONTS.body, fontWeight: '700', flex: 1 },
  stepBody: { color: COLORS.textSecondary, fontSize: FONTS.caption, lineHeight: 20 },
  inlineLinkWrapper: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
  inlinePhone: { color: COLORS.accent, fontWeight: '700', textDecorationLine: 'underline' },
  inlineUrl: { color: COLORS.primary, textDecorationLine: 'underline' },

  commsSection: { marginBottom: 24 },
  commsLabel: { color: COLORS.accent, fontSize: 13, fontWeight: '800', letterSpacing: 2, marginBottom: 12 },
  draftCardMain: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  draftCardTitleMain: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  draftCardTextMain: { color: COLORS.textSecondary, fontSize: 13, fontStyle: 'italic', lineHeight: 20, marginBottom: 10 },
  draftCardCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  draftCardCopyText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },

  placesHeader: { marginBottom: 14 },
  placesHeaderTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '800', letterSpacing: 2 },

  placeCard: {
    flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  placeIndex: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  placeIndexText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  placeDetails: { flex: 1 },
  placeName: { color: COLORS.text, fontSize: FONTS.body, fontWeight: '600', marginBottom: 6 },
  placeContactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  contactChip: {
    backgroundColor: COLORS.surfaceLight, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  contactChipText: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  websiteChip: {
    backgroundColor: COLORS.primaryDim + '33', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  websiteChipText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  noContact: { color: COLORS.textMuted, fontSize: 12 },

  // Sidebar Layouts
  webSidebar: {
    width: 380,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    backgroundColor: COLORS.surface,
    height: '100%',
  },
  mobileSidebar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '90%',
    backgroundColor: COLORS.surface,
    zIndex: 1000,
    elevation: 10,
    height: '100%',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  sidebarHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sidebarHeaderTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800', letterSpacing: 1.5 },
  sidebarHeaderSubtitle: { color: COLORS.accent, fontSize: 11, fontWeight: '600', marginTop: 2 },
  sidebarCloseBtn: { padding: 4 },
  sidebarTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  sidebarTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 4,
  },
  sidebarTabActive: {
    borderBottomColor: COLORS.primary,
  },
  sidebarTabLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  sidebarTabLabelActive: { color: COLORS.primary },
  sidebarContentScroll: { padding: 20 },

  // Sidebar Tab Passport Component
  tabContainer: { width: '100%' },
  passportCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
  },
  passportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 10,
    marginBottom: 12,
    gap: 8,
  },
  passportHeaderTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  passportField: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 6,
    marginBottom: 8,
  },
  passportLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  passportValue: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 2 },
  passportSummaryText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontStyle: 'italic', lineHeight: 16, marginTop: 4 },

  qrContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrImage: { width: 160, height: 160 },
  qrCaption: { color: '#333', fontSize: 10, fontWeight: '600', marginTop: 8, textAlign: 'center' },

  // Sidebar Resources
  filterPills: { flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  filterPill: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterPillActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.primary,
  },
  filterPillText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700' },
  filterPillTextActive: { color: '#fff' },

  resourceList: {},
  resourceSectionTitle: { color: COLORS.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  resourceCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  resourceCardName: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  resourceCardDetail: { color: COLORS.primary, fontSize: 11, fontWeight: '600', marginTop: 2 },
  resourceCardDesc: { color: COLORS.textMuted, fontSize: 10, marginTop: 4 },
  resourceCallButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceLinkCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  resourceLinkText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', maxWidth: '80%' },
  emptyText: { color: COLORS.textMuted, fontSize: 11, fontStyle: 'italic', textAlign: 'center', marginVertical: 12 },

  // Sidebar Drafts
  draftBox: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  draftBoxHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  draftBoxTitle: { color: COLORS.text, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  draftBoxText: { color: COLORS.textSecondary, fontSize: 12, fontStyle: 'italic', lineHeight: 18, marginBottom: 12 },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyPillText: { color: COLORS.primary, fontSize: 10, fontWeight: '700' },

  // Game — Guided Action Plan Styles
  gameStartButton: {
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    marginBottom: 20,
  },
  gameStartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  gameStartText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  gameContainer: {
    marginBottom: 24,
  },
  gameProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gameStepCounter: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  gamePhaseBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  gamePhaseBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: COLORS.card,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  gameStepCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  actionHighlightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primaryDim + '22',
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  actionHighlightText: {
    color: COLORS.text,
    fontSize: FONTS.caption,
    fontWeight: '700',
    lineHeight: 20,
    flex: 1,
  },
  altBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF980022',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  altBadgeText: {
    color: '#FF9800',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  helplineCrisisBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF525244',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  helplineCrisisLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  helplineCrisisBody: {
    color: COLORS.textSecondary,
    fontSize: FONTS.caption,
    lineHeight: 20,
    marginBottom: 16,
  },
  helplineBigNumberBox: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FF525244',
  },
  helplineBigNumber: {
    color: '#FF5252',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 3,
  },
  helplineBigLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 6,
  },
  gameButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gameYesButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  gameYesButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  gameNoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: '#FF525255',
    paddingVertical: 16,
    borderRadius: 14,
  },
  gameNoButtonText: {
    color: '#FF5252',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  gameCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C62828',
    paddingVertical: 18,
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  gameCallButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  gameDoneCard: {
    marginTop: 4,
  },
  gameDoneGradient: {
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  gameDoneTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 12,
  },
  gameDoneSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONTS.caption,
    marginTop: 6,
    textAlign: 'center',
  },
  gameDoneComms: {
    marginBottom: 16,
  },
  gameDoneCommsLabel: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
  },
  gameResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    borderRadius: 14,
  },
  gameResetText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
