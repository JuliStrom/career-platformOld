import { Image } from 'expo-image';
import { View } from 'react-native';

// Original outlined wordmark from assets/images/logo.svg, with separate brand colors.
function sources(foreground: string, accent: string) {
  const emblem = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M38.7 20.9A15 15 0 1 0 38.7 41.1" fill="none" stroke="${foreground}" stroke-width="7.4" stroke-linecap="round"/><path d="M39.4 41.5L50.8 52.9" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round"/></svg>`;
  const wordmark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="318 160 1010 190"><path d="M634 -21Q459 -21 333 51.5Q207 124 139.5 253.5Q72 383 72 555Q72 728 139.5 857.5Q207 987 333 1059.5Q459 1132 634 1132Q741 1132 830 1104Q919 1076 986 1024.5Q1053 973 1094.5 899.5Q1136 826 1149 735L827 681Q819 725 802.5 759Q786 793 762.5 817Q739 841 707.5 853Q676 865 638 865Q571 865 524 828.5Q477 792 452.5 722.5Q428 653 428 557Q428 461 452.5 391Q477 321 524 283.5Q571 246 638 246Q677 246 708 258.5Q739 271 763.5 295.5Q788 320 804.5 355.5Q821 391 828 436L1150 384Q1137 290 1095.5 215.5Q1054 141 987 88Q920 35 830.5 7Q741 -21 634 -21Z" transform="translate(318.00 340) scale(0.117188 -0.117188)" fill="${foreground}"/><path d="M464 638L464 0L115 0L115 1118L443 1118L450 836L435 836Q476 969 563.5 1050.5Q651 1132 799 1132Q916 1132 1003 1080Q1090 1028 1138 933Q1186 838 1186 712L1186 0L837 0L837 644Q837 738 789 791.5Q741 845 655 845Q599 845 555.5 820.5Q512 796 488 750Q464 704 464 638Z" transform="translate(450.05 340) scale(0.117188 -0.117188)" fill="${foreground}"/><path d="M718 1118L718 859L20 859L20 1118ZM168 1384L517 1384L517 342Q517 298 538 276.5Q559 255 606 255Q624 255 656.5 259Q689 263 703 267L748 13Q689 -4 634 -10Q579 -16 530 -16Q352 -16 260 67.5Q168 151 168 311Z" transform="translate(591.71 340) scale(0.117188 -0.117188)" fill="${foreground}"/><path d="M115 0L115 1118L454 1118L454 914L466 914Q496 1025 565.5 1078.5Q635 1132 727 1132Q751 1132 777.5 1129Q804 1126 826 1120L826 816Q801 825 760.5 829.5Q720 834 688 834Q624 834 573 805.5Q522 777 493 727Q464 677 464 610L464 0Z" transform="translate(672.55 340) scale(0.117188 -0.117188)" fill="${foreground}"/><path d="M786 -16Q701 -16 638.5 12.5Q576 41 535 86Q494 131 472 181L460 181L460 0L115 0L115 1490L464 1490L464 926L472 926Q493 977 533.5 1024Q574 1071 636.5 1101.5Q699 1132 788 1132Q906 1132 1007.5 1070.5Q1109 1009 1171.5 881.5Q1234 754 1234 558Q1234 368 1174 240.5Q1114 113 1012 48.5Q910 -16 786 -16ZM667 256Q734 256 780.5 293.5Q827 331 851 399.5Q875 468 875 558Q875 649 851 716.5Q827 784 781 821.5Q735 859 667 859Q600 859 553 822.5Q506 786 481 718.5Q456 651 456 558Q456 467 481 399Q506 331 553.5 293.5Q601 256 667 256Z" transform="translate(762.53 340) scale(0.117188 -0.117188)" fill="${foreground}"/><path d="M503 -14Q386 -14 298.5 38Q211 90 163 185Q115 280 115 406L115 1118L464 1118L464 474Q464 380 512.5 326.5Q561 273 646 273Q704 273 746.5 297.5Q789 322 813 368.5Q837 415 837 480L837 1118L1186 1118L1186 0L858 0L852 282L867 282Q825 148 737 67Q649 -14 503 -14Z" transform="translate(904.78 340) scale(0.117188 -0.117188)" fill="${foreground}"/><path d="M718 1118L718 859L20 859L20 1118ZM168 1384L517 1384L517 342Q517 298 538 276.5Q559 255 606 255Q624 255 656.5 259Q689 263 703 267L748 13Q689 -4 634 -10Q579 -16 530 -16Q352 -16 260 67.5Q168 151 168 311Z" transform="translate(1046.44 340) scale(0.117188 -0.117188)" fill="${foreground}"/><path d="M636 -21Q461 -21 334 48.5Q207 118 139.5 247Q72 376 72 555Q72 727 139.5 857Q207 987 331 1059.5Q455 1132 623 1132Q741 1132 839.5 1095Q938 1058 1010.5 985.5Q1083 913 1122.5 807Q1162 701 1162 562L1162 474L196 474L196 677L996 677L833 629Q833 707 809.5 763Q786 819 740 849Q694 879 626 879Q558 879 511 848.5Q464 818 439.5 763.5Q415 709 415 636L415 490Q415 404 443.5 346.5Q472 289 523 260.5Q574 232 642 232Q689 232 727.5 245Q766 258 793.5 284Q821 310 835 347L1146 296Q1118 200 1049.5 128.5Q981 57 876.5 18Q772 -21 636 -21Z" transform="translate(1127.28 340) scale(0.117188 -0.117188)" fill="${foreground}"/><path d="M361 -21Q281 -21 226.5 32.5Q172 86 172 165Q172 245 226.5 298.5Q281 352 361 352Q441 352 495.5 298.5Q550 245 550 165Q550 86 495.5 32.5Q441 -21 361 -21Z" transform="translate(1260.62 340) scale(0.117188 -0.117188)" fill="${accent}"/></svg>`;
  const dataUri = (svg: string) => ({
    uri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
  });
  return { emblem: dataUri(emblem), wordmark: dataUri(wordmark) };
}

const light = sources('#1e3a5f', '#4c5bff');
const dark = sources('#f3f0e8', '#85b2ff');

export function BrandLogo({ dark: darkBackground }: { dark: boolean }) {
  const theme = darkBackground ? dark : light;
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="cntrbute"
    >
      <Image
        source={theme.emblem}
        style={{ width: 36, height: 36 }}
        contentFit="contain"
        accessible={false}
      />
      <Image
        source={theme.wordmark}
        style={{ width: 202, height: 44 }}
        contentFit="contain"
        accessible={false}
      />
    </View>
  );
}
