import React from 'react';
import { Link } from 'wouter';
import { VnPlayer } from '@/components/vn-player';
import { Button } from '@/components/ui/button';
import { testSceneData } from '@/test-scene-data';
import { PlayerLayout } from '@/components/player-layout';
import { useTranslation } from "react-i18next";

export default function TestPlayer() {
  const { t } = useTranslation();
  const [showPlayer, setShowPlayer] = React.useState(false);
  
  const handleReturn = () => {
    setShowPlayer(false);
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">{t('testPlayer.title')}</h1>
        <p className="mt-2 text-gray-600">{t('testPlayer.description')}</p>
      </div>
      
      {showPlayer ? (
        <PlayerLayout
          title={t('testPlayer.layoutTitle', 'Test VN Player')}
          description={t('testPlayer.layoutDescription', 'Test the visual novel player with sample scene data')}
          showShareButtons={false}
        >
          <VnPlayer 
            actData={testSceneData} 
            actNumber={1} 
            onReturn={handleReturn}
            mode="generated"
          />
        </PlayerLayout>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Button onClick={() => setShowPlayer(true)} className="bg-green-600 hover:bg-green-700">
            {t('testPlayer.startButton', 'Start Test Player')}
          </Button>
          
          <Link href="/">
            <Button variant="outline" className="mt-4">
              {t('common.backToHome', 'Back to Home')}
            </Button>
          </Link>
          
          <div className="mt-8 max-w-2xl mx-auto p-6 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-bold mb-4">{t('testPlayer.infoTitle', 'Test Data Information')}</h2>
            <p className="mb-4">{t('testPlayer.infoDesc', 'This test page uses sample scene data in the new simplified format:')}</p>
            <pre className="bg-gray-800 text-white p-4 rounded text-sm overflow-auto">
{`{
  "scene1": { ... },
  "scene2": { ... },
  ...
}`}
            </pre>
            <p className="mt-4">{t('testPlayer.formatNote', 'The player should automatically convert this to the expected format.')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
