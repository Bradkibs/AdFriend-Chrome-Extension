import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Save, Trash2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import './styles.css'

const OptionsPage = () => {
    const [quotes, setQuotes] = useState([]);
    const [activities, setActivities] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [newItem, setNewItem] = useState('');
    const [savedAlert, setSavedAlert] = useState(false);
    const [dailyQuote, setDailyQuote] = useState(null);

    useEffect(() => {
        // Load saved settings
        chrome.storage.sync.get(
            ['customQuotes', 'customActivities', 'customReminders'],
            (result) => {
                setQuotes(result.customQuotes || []);
                setActivities(result.customActivities || []);
                setReminders(result.customReminders || []);
            }
        );
        fetchDailyQuote();
    }, []);

    const fetchDailyQuote = async () => {
        try {
            const response = await fetch('https://api.quotable.io/random');
            const data = await response.json();
            setDailyQuote({
                content: data.content,
                author: data.author
            });
        } catch (error) {
            console.error('Error fetching quote:', error);
        }
    };

    const addItem = (type) => {
        if (!newItem.trim()) return;

        switch (type) {
            case 'quotes':
                setQuotes([...quotes, newItem]);
                break;
            case 'activities':
                setActivities([...activities, newItem]);
                break;
            case 'reminders':
                setReminders([...reminders, newItem]);
                break;
        }
        setNewItem('');
    };

    const removeItem = (type, index) => {
        switch (type) {
            case 'quotes':
                setQuotes(quotes.filter((_, i) => i !== index));
                break;
            case 'activities':
                setActivities(activities.filter((_, i) => i !== index));
                break;
            case 'reminders':
                setReminders(reminders.filter((_, i) => i !== index));
                break;
        }
    };

    const saveSettings = () => {
        chrome.storage.sync.set({
            customQuotes: quotes,
            customActivities: activities,
            customReminders: reminders
        }, () => {
            setSavedAlert(true);
            setTimeout(() => setSavedAlert(false), 3000);
        });
    };

    const ItemList = ({ items, type, onRemove }) => (
        <div className="space-y-2">
            {items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="flex-1">{item}</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(type, index)}
                        className="h-8 w-8"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-6">
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>AdFriend Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    {savedAlert && (
                        <Alert className="mb-4">
                            <AlertDescription>
                                Settings saved successfully!
                            </AlertDescription>
                        </Alert>
                    )}

                    {dailyQuote && (
                        <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50">
                            <CardContent className="pt-6">
                                <div className="text-lg font-serif italic">"{dailyQuote.content}"</div>
                                <div className="text-right mt-2 text-gray-600">- {dailyQuote.author}</div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={fetchDailyQuote}
                                    className="mt-4"
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Get New Quote
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    <Tabs defaultValue="quotes">
                        <TabsList className="mb-4">
                            <TabsTrigger value="quotes">Quotes</TabsTrigger>
                            <TabsTrigger value="activities">Activities</TabsTrigger>
                            <TabsTrigger value="reminders">Reminders</TabsTrigger>
                        </TabsList>

                        <TabsContent value="quotes">
                            <div className="space-y-4">
                                <ItemList items={quotes} type="quotes" onRemove={removeItem} />
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add a new quote..."
                                        value={newItem}
                                        onChange={(e) => setNewItem(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addItem('quotes')}
                                    />
                                    <Button onClick={() => addItem('quotes')}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="activities">
                            <div className="space-y-4">
                                <ItemList items={activities} type="activities" onRemove={removeItem} />
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add a new activity..."
                                        value={newItem}
                                        onChange={(e) => setNewItem(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addItem('activities')}
                                    />
                                    <Button onClick={() => addItem('activities')}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="reminders">
                            <div className="space-y-4">
                                <ItemList items={reminders} type="reminders" onRemove={removeItem} />
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add a new reminder..."
                                        value={newItem}
                                        onChange={(e) => setNewItem(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addItem('reminders')}
                                    />
                                    <Button onClick={() => addItem('reminders')}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <Button
                        className="mt-6"
                        onClick={saveSettings}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default OptionsPage;